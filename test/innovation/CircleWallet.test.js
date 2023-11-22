const util = require('util')
const { BigNumber, utils } = require('ethers')
const { m, d, b, n, s } = require('./help/BigNumberHelp')
const crypto = require('crypto')
const forge = require('node-forge');

const NATIVE_ETH_ADDRESS = '0x0000000000000000000000000000000000000000'

const TEST_API_KEY = 'TEST_API_KEY:1563529a9fdc18a6f7504a1220a57e43:9932ad82c79af24e90086845ef3aa14b'
const UUIDv4 = '740e8561-859f-4c00-af31-45de80e48cab' //generate by: https://www.uuidgenerator.net/

var hexEncodedEntitySecret = '0496b5acb077d2fe4cdd7d49babacb5fb25e829491f67ca383eb79366cf1a845'
var base64EncryptedData = 'f0uzsVBxhIuvsjzUleagModg53pnPvSAnlVhsMLYO62rv42lYBrJoDGpNQ8iUz6aLHIog0KCFgiYTrYdvE8b5jUlTAtdGybmWUhDBPBfxFd9el11HD7QdwbJwFc7B5q+NE0HP7w+KTDpi0JaoA03v7+LnC1D5StrUsKVrNtTyAVGfiAgqwtOLUuM88/NOaSPaqxU5O/yYEzpFXyl+QNmS0hFh+q/uGZYtpiEJzFMYjUhDW8CPlJK/s6zsYLm1CFbCYbNvABWiM88Kdsgra90OCwA/UqhZN3zQ8113AnEmaAIXrXLiA2a2IXlTkewPeX3gLxSP7BeNFIxvoY+lfadDpS++CBTAxqOAsNSHKPd90vq2JQMoMgUH1MDTlQEvKnRaM+AYulkPkdrruWkQlBOGIjZQ9TKlTAVzmXBq98cbScrITngmmUXtbQ7aALQ4I7K6JiN7au6nqKYfXBmcSk1F36SKJ4DzD492RBMJm6AjzPGFzYFYqLbz8/QtTl1yViSTmgcRCaCUTJjYDGx2y55Rd7XlupErhqLDLttIYwCHvkYsho/a3v0SLyhJojB3LBxqE0X9QwL7oaF0QirbwDX4h/Petxac2cOJYpZn7iFJYqjw+jmHqlB2TEaCfvGX9bjrg9x4dqgsXjXaSf7qAvUMaUtrHfVRUDMwQn8Dz51eYo='
var walletSetId = '018b755d-4702-7b16-b21c-64d079e8804d'

describe('SmartWallet-Bundler.test', function () {
    let accounts
    let provider
    let bundler
    let bundlerManager
    let usdt
    let usdc
    let dai
    let factory


    before(async function () {
        accounts = await ethers.getSigners()
        provider = accounts[0].provider
    })


    it('init', async function () {
        //step 1
        response = await fetch('https://api.circle.com/v1/w3s/config/entity/publicKey', {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'authorization': 'Bearer ' + TEST_API_KEY
            }
        })
        json = await response.json()
        const publicKeyString = json.data.publicKey
        console.log('publicKeyString:', publicKeyString)

        //step 2
        // const randomBytes = crypto.randomBytes(32)
        // hexEncodedEntitySecret = randomBytes.toString('hex')
        console.log('Hex encoded entity secret:', hexEncodedEntitySecret)

        const entitySecret = forge.util.hexToBytes(hexEncodedEntitySecret);
        if (entitySecret.length != 32) {
            console.log('invalid entity secret');
            return;
        }

        // encrypt data by the public key
        const publicKey = forge.pki.publicKeyFromPem(publicKeyString)
        const encryptedData = publicKey.encrypt(entitySecret, 'RSA-OAEP', {
            md: forge.md.sha256.create(),
            mgf1: {
                md: forge.md.sha256.create()
            }
        })

        // encode to base64
        base64EncryptedData = forge.util.encode64(encryptedData)
        console.log('Entity secret ciphertext:', base64EncryptedData)

        // Hex encoded entity secret: 0496b5acb077d2fe4cdd7d49babacb5fb25e829491f67ca383eb79366cf1a845
        // Entity secret ciphertext: f0uzsVBxhIuvsjzUleagModg53pnPvSAnlVhsMLYO62rv42lYBrJoDGpNQ8iUz6aLHIog0KCFgiYTrYdvE8b5jUlTAtdGybmWUhDBPBfxFd9el11HD7QdwbJwFc7B5q+NE0HP7w+KTDpi0JaoA03v7+LnC1D5StrUsKVrNtTyAVGfiAgqwtOLUuM88/NOaSPaqxU5O/yYEzpFXyl+QNmS0hFh+q/uGZYtpiEJzFMYjUhDW8CPlJK/s6zsYLm1CFbCYbNvABWiM88Kdsgra90OCwA/UqhZN3zQ8113AnEmaAIXrXLiA2a2IXlTkewPeX3gLxSP7BeNFIxvoY+lfadDpS++CBTAxqOAsNSHKPd90vq2JQMoMgUH1MDTlQEvKnRaM+AYulkPkdrruWkQlBOGIjZQ9TKlTAVzmXBq98cbScrITngmmUXtbQ7aALQ4I7K6JiN7au6nqKYfXBmcSk1F36SKJ4DzD492RBMJm6AjzPGFzYFYqLbz8/QtTl1yViSTmgcRCaCUTJjYDGx2y55Rd7XlupErhqLDLttIYwCHvkYsho/a3v0SLyhJojB3LBxqE0X9QwL7oaF0QirbwDX4h/Petxac2cOJYpZn7iFJYqjw+jmHqlB2TEaCfvGX9bjrg9x4dqgsXjXaSf7qAvUMaUtrHfVRUDMwQn8Dz51eYo=

        //step 3: https://console.circle.com/wallets/dev/configurator
    })


    // it('walletSets', async function () {
    //     response = await fetch('https://api.circle.com/v1/w3s/developer/walletSets', {
    //         method: 'POST',
    //         headers: {
    //             'accept': 'application/json',
    //             'content-type': 'application/json',
    //             'authorization': 'Bearer ' + TEST_API_KEY
    //         },
    //         body: JSON.stringify({
    //             'idempotencyKey': UUIDv4,
    //             'name': 'TestWalletSet',
    //             'entitySecretCiphertext': base64EncryptedData
    //         })
    //     })
    //     json = await response.json()
    //     console.log('json:', json)

    //     //json: {
    //     //     data: {
    //     //         walletSet: {
    //     //             id: '018b755d-4702-7b16-b21c-64d079e8804d',
    //     //             custodyType: 'DEVELOPER',
    //     //             name: 'TestWalletSet',
    //     //             updateDate: '2023-10-28T08:18:49Z',
    //     //             createDate: '2023-10-28T08:18:49Z'
    //     //             }
    //     //         }
    //     //     }
    //     // }

    // })


    it('wallets', async function () {
        response = await fetch('https://api.circle.com/v1/w3s/developer/wallets', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'authorization': 'Bearer ' + TEST_API_KEY
            },
            body: JSON.stringify({
                'idempotencyKey': UUIDv4,
                'name': 'TestWalletSet',
                'blockchains': ['MATIC-MUMBAI'],
                'count': 2,
                'entitySecretCiphertext': base64EncryptedData,
                'walletSetId': walletSetId
            })
        })
        json = await response.json()
        console.log('json:', util.inspect(json, false, 4, true))

        // json: {
        //     data: {
        //         wallets: [
        //             {
        //                 id: 'fcae300a-a2e1-4618-a629-d15bb4e12aa7',
        //                 state: 'LIVE',
        //                 walletSetId: '018b755d-4702-7b16-b21c-64d079e8804d',
        //                 custodyType: 'DEVELOPER',
        //                 address: '0x2857b8b5194b02219ad31f7a7611d09d19f2de7f',
        //                 blockchain: 'MATIC-MUMBAI',
        //                 accountType: 'EOA',
        //                 updateDate: '2023-10-28T08:30:43Z',
        //                 createDate: '2023-10-28T08:30:43Z'
        //             },
        //             {
        //                 id: '9e58dc73-3b3d-4d59-8c5a-695d8e78f9d3',
        //                 state: 'LIVE',
        //                 walletSetId: '018b755d-4702-7b16-b21c-64d079e8804d',
        //                 custodyType: 'DEVELOPER',
        //                 address: '0x67e9daba1a2e35ddf6ec620a88a7761dfa1c5da4',
        //                 blockchain: 'MATIC-MUMBAI',
        //                 accountType: 'EOA',
        //                 updateDate: '2023-10-28T08:30:43Z',
        //                 createDate: '2023-10-28T08:30:43Z'
        //             }
        //         ]
        //     }
        // }
    })

})