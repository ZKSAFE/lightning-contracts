# 以太坊闪电网络

#### 作者: George
<br>

## 简介
以太坊闪电网络（以下简称ELN）是对以太坊的链下扩容，通过双方在链下对一系列操作进行签名，最后再上链执行。主要用于建立双方之间在上链之前的信任，在ELN之前，这种信任只能上链，而ELN把信任扩展到了链下。

ELN核心原理是，双方都使用智能合约钱包（以下简称智能钱包），把双方的calls全部合并成一个call，双方都对这个call进行签名，最后这个call由双方的智能钱包在一个tx里执行，这就保证了原子性，如果有一方不执行或执行出错，那么全部回滚，双方都没有损失。

这其实是一种链下合约，合约内容是双方的calls，附上双方的签名，信任建立在执行之前，而上链执行即合约生效。

<br>

## 源码实现
在Alice的智能钱包中，添加`atomSignCall()`函数：

```solidity
function atomSignCall(
    bytes calldata atomCallbytes,
    uint32 deadline,
    bytes calldata signature
) external onlyBob {
    require(deadline >= block.timestamp, "atomSignCall: Expired");
    bytes32 msgHash = keccak256(
        bytes.concat(
            msg.data[:msg.data.length - signature.length - 32],
            bytes32(block.chainid),
            bytes20(address(this)),
            bytes4(valid)
        )
    );
    require(!usedMsgHashes[msgHash], "atomSignCall: Used msgHash");
    require(
        owner == msgHash.toEthSignedMessageHash().recover(signature),
        "atomSignCall: Invalid Signature"
    );

    //do calls
    uint i;
    while(i < atomCallbytes.length) {
        address to = address(uint160(bytes20(atomCallbytes[i:i+20])));
        uint value = uint(bytes32(atomCallbytes[i+20:i+52]));
        uint len = uint(bytes32(atomCallbytes[i+52:i+84]));

        (bool success, bytes memory result) = to.call{value: value}(atomCallbytes[i+84:i+84+len]);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }

        i += 84 + len;
    }

    usedMsgHashes[msgHash] = true;
}
```

这样，Alice可以通过一个`signature`来对atomCallbytes，即多个calls进行签名，确保这些calls合在一起具有原子性。`onlyBob`限制了`atomSignCall()`只能由Bob进行调用，如果Bob调用了这个函数，也就意味着Bob也认可这些calls，并签了名。

以上的calls全部是从Alice的智能钱包发起，如果要加入从Bob的智能钱包发起的call，比如说让Bob给Alice转账，那么Bob的智能钱包需要有`executeOperation()`和`callback()`函数：

```solidity
function executeOperation(
    address wallet,
    bytes calldata data
) public onlyOwner {
    _callTo = wallet;

    (bool success, bytes memory result) = _callTo.call{
        value: 0
    }(data);

    if (!success) {
        assembly {
            revert(add(result, 32), mload(result))
        }
    }

    _callTo = address(0);
}

function callback(
    address to,
    uint value,
    bytes calldata data
) external {
    require(msg.sender == _callTo, "callback: Only _callTo");

    (bool success, bytes memory result) = to.call{value: value}(data);
    if (!success) {
        assembly {
            revert(add(result, 32), mload(result))
        }
    }
}
```

其中，`executeOperation()`用于执行Alice智能钱包的`atomSignCall()`调用，calls如果包含有从Bob的智能钱包发起的call，那么Alice的智能钱包会调用Bob智能钱包的`callback()`，`_callTo`确保了`callback()`的调用在calls中，即实现了回调。

以上3个函数便是以太坊闪电网络的全部源码。

<br>

### 数据结构
众所周知，每一个call由`to`、`value`、`data`组成，我们把这三个参数编码为一个bytes，由于`data`本身也是bytes，所以需要添加一个长度参数`len`来表示`data`的长度，于是我们得到了：

<p align="center"><b>callbytes = to + value + len + data</b></p>

那么，多个calls可编码为一个call，就有了：

<p align="center"><b>atomCallbytes = callbytes + callbytes + callbytes ...</b></p>

也就是`do calls`所实现的，它有原子性的特点，即这些call的调用，要么全部成功，要么全部失败，这是信任的基础。

然后，用户需要对这组calls进行签名，还包括：
- deadline：签名的过期时间
- block.chainid：只对指定的链有效
- address(this)：一个私钥可能对应多个合约钱包，需要指定一个
- valid：用户可以随时修改valid，修改后，之前签过的还未上链的`atomCallbytes`将失效，实现签名的撤销

<br>

## 使用场景
### gas代付服务
我们先用一个简单的例子来说明：gas代付。它相当于user和bundler之间签署一组calls，calls内容为：
1. user想要通过他的智能钱包发起多个calls
2. user给bundler转账1USDT作为gas，包含在calls里
3. bundler负责提交上链

user编码calls内容，附上自己的签名，这个签名能确保内容不可更改。然后发送给bundler，如果bundler觉得gas给得太少划不来，可以不提交上链；如果认可calls内容，那么签名上链即可。calls执行后，user得到了他想要的操作，bundler得到了gas小费。

值得一提的事，ERC4337也能实现gas代付，ELN跟ERC4337并不冲突，你可以在智能钱包里同时实现ELN和ERC4337。

从实测来看，ELN更简单更省gas。

<br>

### 代币互换
假设user想要用2000USDT交换bundler的1ETH，这是一个典型的信任问题：
- user先转了2000USDT，bundler欺骗了user，user损失2000USDT
- bundler先转了1ETH，user欺骗了bundler，bundler损失1ETH

用ELN，calls内容为：
1. user转2000USDT给bundler
2. bundler转1ETH给user
3. bundler负责提交上链

user编码calls内容，附上自己的签名，这个签名能确保内容不可更改。然后发送给bundler，如果bundler觉得划不来，可以不提交上链，当作挂单存在服务器，等到价格合适，那么签名上链即可。calls执行后，user得到了1ETH，bundler得到了2000USDT。

ELN可以作为挂单使用，对于user来说：
- 免gas
- 免交易手续费
- 免授权
- 免充值
- 不受MEV影响

最重要一点是，资金安全。虽然挂单存在bundler的服务器，但是bundler也无法单独拿走user的2000USDT。这跟授权不一样，授权是服务方可以拿走2000USDT，而不给user任何东西，在服务方被黑客攻击后，黑客就可以偷走用户授权的钱。而即使黑客拿到了ELN服务方的私钥以及所有挂单，黑客能做的也只有扮演bundler，把1ETH给user，才能拿走user的2000USDT，对于user来说，并没有影响。

<br>

### 交易聚合
对于bundler来说，通过闪电贷完成交易，自己就是聚合器，而且不需要资金池，实现如下：
1. bundler通过闪电贷借来2000USDT
2. bundler把2000USDT在uniswap兑换为1.001ETH
3. 执行user的挂单calls：
   1. user转2000USDT给bundler
   2. bundler转1ETH给user
4. bundler把2000USDT还给闪电贷
5. bundler把盈利的0.001ETH转到冷钱包
6. bundler负责提交上链

所有操作在一个tx里完成，可以极大的提升交易的效率，以及资金安全。由于bundler没有资金池，以及盈利也全部放在另一个冷钱包，所以即使被黑客攻击，bundler也几乎没有损失（最多损失一点点gas）。

除了通过闪电贷，bundler还可以聚合做市商。假设有一家做市商maker愿意用1ETH换1999USDT，maker提交的calls内容为：
1. maker转1ETH给bundler
2. 执行user的挂单calls：
   1. user转2000USDT给bundler
   2. bundler转1ETH给user
3. bundler转1999USDT给user
4. bundler把盈利的1USDT转到冷钱包
5. bundler负责提交上链

这是一个链下合约的嵌套，实现了三方的链下合约，上链执行后，maker用1ETH换到1999USDT，user用2000USDT换到了1ETH，bundler作为中介赚到了1USDT，三方共识达成。

<br>

## 最后
比特币有BRC20，以太坊为什么不能有闪电网络？

比特币闪电网络是用双方的链下签名进行链下扩容。

以太坊闪电网络是用双方的链下签名进行链下扩展。

如今，L2成为了主要的扩容技术，把以前昂贵的操作变得便宜了；而ELN扩展的是应用的可能性，把以前不能实现的（比如限价单），现在能实现了。期望将来有更多创新的DEFI和Dapp实现在ELN上，为以太坊的生态繁荣助力。
