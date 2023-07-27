# 以太坊闪电网络

#### 作者: George
<br>

## 摘要
以太坊闪电网络（ELN）是以太坊的链下扩容方案。与第二层（L2）扩展方案不同，L2关注的是提高交易速度和降低gas费用。然而，在链上实施限价单时，即使gas费用再便宜，用户仍然需要支付费用并等待区块确认。ELN的扩展目标是提升应用的可能性。它通过双方在链下对一系列操作进行签名，然后在链上执行。ELN主要用于在上链之前建立双方之间的信任。例如，限价单涉及用户和交易所之间的信任。ELN既能确保用户真正有交易意图，也能保证交易所不会盗取用户的资金。这种信任建立在上链之前，因此不需要支付gas费用，并且交易瞬时确认。

需要注意的是，ELN的签名不是授权，而是确认意图。用户对一系列操作进行签名，表示他们希望执行这些操作，并且这些操作具有原子性。例如，一个限价单包括两次转账操作：用户向交易所转账USDT，交易所向用户转账ETH。如果第一笔转账成功而第二笔失败，即交易所占用了用户的USDT而没有提供ETH，这是不可接受的。原子性保证了这两笔转账要么都成功，要么都失败，不会出现其中一笔失败而另一笔成功的情况。以太坊智能合约通过原子性建立信任，而ELN将这种信任扩展到链下。

可以将ELN理解为一种链下合约，合约内容包括一系列操作以及双方的签名，当合约上链执行时，合约生效。如果说智能合约建立的是人与机器之间的信任，因为机器不会欺诈，所以人可以相信机器；那么ELN因为签名的人不会被对方欺诈，更像是建立人与人之间的信任，所以ELN可以把以太坊扩展到更多的领域。

<br>

## 核心原理
ELN核心原理是，双方都使用智能合约钱包（以下简称智能钱包），把双方的calls全部合并成一个call，双方都对这个call进行签名，最后这个call在一个tx里执行，这就保证了原子性，如果有一方不执行或执行出错，那么全部回滚，双方都没有损失。

因为最后需要上链，为了不引入第三方中间人来上链，确保所有事情都是双方之间的事，ELN必须由双方中的一方来执行上链，所以合约里只需要验证非上链方的签名，而上链方的签名在共识层验证。

<br>

## 源码实现
假设Alice是非上链方，Bob是上链方。在Alice的智能钱包中，添加`atomSignCall()`函数：

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

其中，`executeOperation()`用于执行Alice智能钱包的`atomSignCall()`调用，calls如果包含从Bob的智能钱包发起的call，那么Alice的智能钱包会调用Bob智能钱包的`callback()`，`_callTo`确保了`callback()`的调用在calls中，即实现了回调。

最后`onlyOwner`确保了上链者只能是Bob，即Bob的签名在共识层验证。整个流程确保了4件事：
1. 一系列的事情即calls具有原子性
2. 必须Alice的链下签名
3. 必须Bob签名并提交上链
4. 没有第三方

以上便是以太坊闪电网络的全部源码。

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

我们尝试过其他的数据格式，这种格式既省gas结构也清晰。

<br>

## 使用场景
ELN源码比较简单，组合使用也很灵活。

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

如今，L2成为了主要的扩容技术，把以前昂贵的操作变得便宜了；而ELN链下签名gas为0，瞬时确认。两者可以无缝结合，为DEFI和Dapp带来更多的可组合性，为以太坊的生态繁荣助力。