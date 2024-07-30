import { BookadotEIP712Test } from './../build/types/BookadotEIP712Test';
import { BookadotEIP712 } from './../build/types/BookadotEIP712';
import { expect, use } from 'chai'
import { ethers } from 'hardhat'
import { describe, it } from 'mocha'
import { solidity } from 'ethereum-waffle'
import { Contract } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

use(solidity)

const types = {
  BookingParameters: [
    { name: 'token', type: 'address' },
    { name: 'bookingId', type: 'string' },
    { name: 'checkInTimestamp', type: 'uint256' },
    { name: 'checkOutTimestamp', type: 'uint256' },
    { name: 'bookingExpirationTimestamp', type: 'uint256' },
    { name: 'bookingAmount', type: 'uint256' },
    { name: 'cancellationPolicies', type: 'CancellationPolicy[]' },
  ],
  CancellationPolicy: [
    { name: 'expiryTime', type: 'uint256' },
    { name: 'refundAmount', type: 'uint256' },
  ],
}

let signer: SignerWithAddress
let signerAddress: string
let bookadotEIP712: BookadotEIP712
let bookadotEIP712Test: BookadotEIP712Test
let chainId: number

beforeEach(async function () {
  let signers = await ethers.getSigners()
  signer = signers[1]
  signerAddress = signer.address

  let BookadotEIP712 = await ethers.getContractFactory('BookadotEIP712')
  bookadotEIP712 = await BookadotEIP712.deploy() as BookadotEIP712
  await bookadotEIP712.deployed()

  let BookadotEIP712Test = await ethers.getContractFactory('BookadotEIP712Test', {
    libraries: {
      BookadotEIP712: bookadotEIP712.address,
    },
  })
  bookadotEIP712Test = await BookadotEIP712Test.deploy(signerAddress) as BookadotEIP712Test
  await bookadotEIP712Test.deployed()

  chainId = (await ethers.provider.getNetwork()).chainId
})

describe('BookadotEIP712', function () {
  describe('Should verify eip712 signature successfully', function () {
    it('Valid data and signature with cancellation policy', async function () {
      const domain = {
        name: 'Bookadot',
        version: '1',
        chainId: chainId,
        verifyingContract: bookadotEIP712Test.address,
      }

      const data = {
        token: '0x9CAC127A2F2ea000D0AcBA03A2A52Be38F8ea3ec',
        bookingId: '2hB2o789n',
        checkInTimestamp: 1650687132,
        checkOutTimestamp: 1650860051,
        bookingExpirationTimestamp: 1650687132,
        bookingAmount: BigInt('100000000000000000000'),
        cancellationPolicies: [
          {
            expiryTime: 1650773900,
            refundAmount: BigInt('50000000000000000000'),
          },
        ],
      }
      const generatedSignature = await signer._signTypedData(domain, types, data)

      let verifyResult = await bookadotEIP712Test.verify(data, generatedSignature)

      expect(verifyResult).true
    })

    it('Valid data and signature without cancellation policy', async function () {
      const domain = {
        name: 'Bookadot',
        version: '1',
        chainId: chainId,
        verifyingContract: bookadotEIP712Test.address,
      }

      const data = {
        token: '0x9CAC127A2F2ea000D0AcBA03A2A52Be38F8ea3ec',
        bookingId: '2hB2o789n',
        checkInTimestamp: 1650687132,
        checkOutTimestamp: 1650860051,
        bookingExpirationTimestamp: 1650687132,
        bookingAmount: BigInt('100000000000000000000'),
        cancellationPolicies: [],
      }
      const generatedSignature = await signer._signTypedData(domain, types, data)

      let verifyResult = await bookadotEIP712Test.verify(data, generatedSignature)

      expect(verifyResult).true
    })
  })
  describe('Should NOT verify eip712 signature successfully', function () {
    it('Wrong chainId', async function () {
      const domain = {
        name: 'Bookadot',
        version: '1',
        chainId: 2,
        verifyingContract: bookadotEIP712Test.address,
      }

      const data = {
        token: '0x9CAC127A2F2ea000D0AcBA03A2A52Be38F8ea3ec',
        bookingId: '2hB2o789n',
        checkInTimestamp: 1650687132,
        checkOutTimestamp: 1650860051,
        bookingExpirationTimestamp: 1650687132,
        bookingAmount: BigInt('100000000000000000000'),
        cancellationPolicies: [
          {
            expiryTime: 1650773900,
            refundAmount: BigInt('50000000000000000000'),
          },
        ],
      }
      const generatedSignature = await signer._signTypedData(domain, types, data)

      await expect(bookadotEIP712Test.verify(data, generatedSignature)).to.be.revertedWith('EIP712: unauthorized signer')
    })

    it('Wrong address of verifying contract', async function () {
      const domain = {
        name: 'Bookadot',
        version: '1',
        chainId: chainId,
        verifyingContract: '0x9CAC127A2F2ea000D0AcBA03A2A52Be38F8ea3ec',
      }

      const data = {
        token: '0x9CAC127A2F2ea000D0AcBA03A2A52Be38F8ea3ec',
        bookingId: '2hB2o789n',
        checkInTimestamp: 1650687132,
        checkOutTimestamp: 1650860051,
        bookingExpirationTimestamp: 1650687132,
        bookingAmount: BigInt('100000000000000000000'),
        cancellationPolicies: [
          {
            expiryTime: 1650773900,
            refundAmount: BigInt('50000000000000000000'),
          },
        ],
      }
      const generatedSignature = await signer._signTypedData(domain, types, data)

      await expect(bookadotEIP712Test.verify(data, generatedSignature)).to.be.revertedWith('EIP712: unauthorized signer')
    })

    it('Re-generate signature with different wallet', async function () {
      let signers = await ethers.getSigners()
      let newSigner = signers[2]

      const domain = {
        name: 'Bookadot',
        version: '1',
        chainId: chainId,
        verifyingContract: bookadotEIP712Test.address,
      }

      const data = {
        token: '0x9CAC127A2F2ea000D0AcBA03A2A52Be38F8ea3ec',
        bookingId: '2hB2o789n',
        checkInTimestamp: 1650687132,
        checkOutTimestamp: 1650860051,
        bookingExpirationTimestamp: 1650687132,
        bookingAmount: BigInt('100000000000000000000'),
        cancellationPolicies: [
          {
            expiryTime: 1650773900,
            refundAmount: BigInt('50000000000000000000'),
          },
        ],
      }
      const generatedSignature = await newSigner._signTypedData(domain, types, data)

      await expect(bookadotEIP712Test.verify(data, generatedSignature)).to.be.revertedWith('EIP712: unauthorized signer')
    })

    it('Modify data passing into contract', async function () {
      const domain = {
        name: 'Bookadot',
        version: '1',
        chainId: chainId,
        verifyingContract: '0x9CAC127A2F2ea000D0AcBA03A2A52Be38F8ea3ec',
      }

      const data = {
        token: '0x9CAC127A2F2ea000D0AcBA03A2A52Be38F8ea3ec',
        bookingId: '2hB2o789n',
        checkInTimestamp: 1650687132,
        checkOutTimestamp: 1650860051,
        bookingExpirationTimestamp: 1650687132,
        bookingAmount: BigInt('100000000000000000000'),
        cancellationPolicies: [
          {
            expiryTime: 1650773900,
            refundAmount: BigInt('50000000000000000000'),
          },
        ],
      }
      const generatedSignature = await signer._signTypedData(domain, types, data)

      const manipulatedData = { ...data, bookingAmount: BigInt('1000000000000000000') }

      await expect(bookadotEIP712Test.verify(manipulatedData, generatedSignature)).to.be.revertedWith('EIP712: unauthorized signer')
    })
  })
})
