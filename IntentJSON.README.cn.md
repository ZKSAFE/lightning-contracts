# IntentJSON

#### 作者: George
<br>

## 摘要
IntentJSON是用来表达用户上链操作的意图。在EOA中，多个操作需要多次提交上链。但在SCA（智能合约账户，包括AA）中，多个操作可以合并在一起提交上链。而这些多个操作的信息，就是意图。用户在Dapp页面上交互，Dapp生成IntentJSON，发送给SCA，然后SCA提交上链。

比方说，用户想在DEX上交易，需要先 [授权]，这有个严重的安全隐患，在EOA中，会弹出一个授权无限的确认框，用户要么接受这个安全隐患，要么自行改授权的数值，对用户来说，这真是一个艰难的决定。更无奈的是，如果swap选的是精准输出的话，那输入就是不精准的，也就是无法确定授权的数值，只能填一个大一点的数，这也是授权无限的原因。

不过我们有了IntentJSON，用户可以跳过授权按钮直接点击swap按钮，DEX生成一个包含 [授权]-[交易] 的IntentJSON，发送给SCA钱包，SCA通过解析IntentJSON可以得知潜在的授权风险，可以自行在IntentJSON加上 [取消授权] 解决潜在风险，最后通过 `callStatic` 模拟整个调用过程，看看到底付出了多少钱，这也是用户最关心的事情。

这有点像超市购物，如果买一件商品就刷一次卡，效率很低，而且你刷到最后才知道总共花了多少钱。所以我们使用购物车，把所有商品扫一遍，得到一个明细列表，以及总共花费多少钱，只刷一次卡即可。

IntentJSON就是这个明细列表，它可以告诉用户总共花费多少，得到了什么，最后只需一次确认。

<br>

## 源码实现
为避免歧义，所有值都用string类型表示。一个典型的IntentJSON如下：

```javascript
{
    "rpc": {
        "chainId": "1", //[require]
        "name": "Ethereum Mainnet", //[option]
        "url": "https://rpc.ankr.com/eth", //[option]
    },
    "calls": [
        //send ETH
        {
            "to": "0xE44081Ee2D0D4cbaCd10b44e769A14Def065eD4D", //[require] to Wallet
            "value": "55251430967242622", //[require] 0.055 ETH
            "data": "0x", //[require]
            "bytesEncodings": [] //[option]
        },
        //send USDC
        {
            "to": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", //USDC
            "value": "0",
            "data": "0x...",
            "bytesEncodings": [
                {
                    "encodeFunction": "abi.encodeFunctionData", //[require]
                    "encodeParams": [
                        "transfer(address,uint256)",
                        [
                            "0xE44081Ee2D0D4cbaCd10b44e769A14Def065eD4D", //to Wallet
                            "100000000" //100 USDC
                        ]
                    ] //[require]
                }
            ]
        }
    ],
    "assetsChanges": [
        {
            "assetType": "Native" //[require]
            "assetParams": [] //[require]
        },
        {
            "assetType": "ERC20"
            "assetParams": [
                "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
            ]
        },
        {
            "assetType": "ERC721"
            "assetParams": [
                "0xed5af388653567af2f388e6224dc7c4b3241c544",
                "8631"
            ]
        }
    ] //[option]
}
```

首先，`IntentJSON.rpc` 表示需要连接的rpc：
- `IntentJSON.rpc.chainId`：必需，整型，表示后面的calls都在该链上
- `IntentJSON.rpc.name`：可选，string类型，如果SCA内置了这条公链，那么以SCA为准，如果没有，可以添加该链RPC
- `IntentJSON.rpc.url`：可选，string类型，如果SCA内置了这条公链，那么以SCA为准，如果没有，可以添加该链RPC

<br>

接着，`IntentJSON.calls` 表示多个操作，每个操作的 `to` \ `value` \ `data` 都是以太坊标准的调用参数：
- `IntentJSON.calls[x].to`：必需，address类型，表示发送ETH的目标地址，如果是合约调用，则为合约地址
- `IntentJSON.calls[x].value`：必需，整型，表示发送ETH的数量，如果是调用合约，则为发送到合约的ETH数量
- `IntentJSON.calls[x].data`：必需，16进制bytes类型，如果是发送ETH，固定为 `0x`，如果是调用合约，则为合约函数和参数合并编码后的 `bytes`

对于调用合约，`IntentJSON.calls[x].data` 是一个编码后的 `bytes`，SCA无法确切知道它是什么，是否包含潜在风险？所以需要 `bytesEncodings` 来表示这个 `bytes` 是如何编码出来的：

- `IntentJSON.calls[x].bytesEncodings[0].encodeFunction`：必需，string类型，用来表示 `encodeParams` 的编码方式，注意 不是给出详细的编码算法，而是指出用什么样的编码方式，比如 `abi.encodeFunctionData` 意为以太坊标准的对合约函数和参数的合并编码，比如ethers.js的 `interface.encodeFunctionData()` 实现
- `IntentJSON.calls[x].bytesEncodings[0].encodeParams`：必须，数组类型，表示这些参数通过 `encodeFunction` 的编码方式，可以得到 `IntentJSON.calls[x].data`，即让SCA确切知道 `data` 是什么

注意 `bytesEncodings` 是数组类型，考虑到有可能 `bytesEncodings[0].encodeParams` 里也存在 `bytes`，需要 `bytesEncodings[1]` 来表示 `bytesEncodings[0]` 的 `bytes` 的来源，如果 `bytesEncodings[1].encodeParams` 还存在 `bytes`，继续需要 `bytesEncodings[2]` 来表示 `bytesEncodings[1]` 的 `bytes` 的来源，如此往复，直到所有 `bytes` 都有确切的来源。

注意 `bytesEncodings` 不是必需的，是为了让SCA确认安全性。如果SCA确定call的合约是安全的，那么可以省略。

<br>

最后，`IntentJSON.assetsChanges` 表示执行完 `calls` 后，用户账户里可能变化的资产（注意 `assetsChanges` 不是必需的，是为了让用户清楚总共花费多少钱，以及得到了什么）：
- `IntentJSON.assetsChanges[x].assetType`：必需，`Native` 表示原生代币，比如ETH\Matic\BNB，其他可选值 `ERC20` \ `ERC721`
- `IntentJSON.assetsChanges[x].assetParams`：必需，如果是 `Native`，`assetParams` 固定是 `[]`；如果是 `ERC20`，`assetParams[0]` 为Token的合约地址；如果是 `ERC721`，`assetParams[0]` 为NFT的合约地址，`assetParams[1]` 为NFT的tokenId。

SCA通过检查 `calls` 可以知道用户付出的资产，但是用户获得的资产是无法知道的，所以需要在 `assetsChanges` 里添加，如果Dapp不主动添加，那么显示的账单可能会大于用户的实际支出，对Dapp不利，建议添加。

关于这部分的源码实现，可以参考：

```solidity
function executeOperationReturnChanges(
    address wallet,
    bytes calldata data,
    address[] calldata retTokens
) public returns (int[] memory changes){
    int[] memory beforeBalances = new int[](retTokens.length);
    uint8 i;
    for (i = 0; i<retTokens.length; i++) {
        if (retTokens[i] == address(0)) {
            beforeBalances[i] = int(wallet.balance);
        } else {
            beforeBalances[i] = int(IERC20(retTokens[i]).balanceOf(wallet));
        }
    }

    executeOperation(wallet, data);

    changes = new int[](retTokens.length);
    for (i = 0; i<retTokens.length; i++) {
            if (retTokens[i] == address(0)) {
            changes[i] = int(wallet.balance) - beforeBalances[i];
        } else {
            changes[i] = int(IERC20(retTokens[i]).balanceOf(wallet)) - beforeBalances[i];
        }
    }
    return changes;
}
```

对于给定的 `retTokens`，通过ethers.js的 `callStatic` 模拟整个调用过程，返回 `retTokens` 的变化值 `changes`，正数表示获得，负数表示付出。

<br>

## 兼容性
IntentJSON 是为SCA设计的，包括AA和ELN都可以使用。

IntentJSON 是链下的改进方案，不改变原有的SCA合约设计，也不改变Dapp的合约设计。

需要改变的是Dapp页面调用钱包的方式，以及钱包对IntentJSON的解析。

<br>

## 最后
SCA可以合并多个操作的特性是行业的一大进步，我们非常期望各个Dapp项目方和钱包方一起推动这个进步，共享行业发展的红利。