import { expect, use } from 'chai'
import { ethers } from 'hardhat'
import { describe, it } from 'mocha'
import { solidity } from 'ethereum-waffle'
import { BigNumber, Contract, Wallet } from 'ethers'

use(solidity)

let bookadotConfig: Contract
let bookadotFactory: Contract
let hostAddress: string
const propertyId = BigNumber.from(1)

beforeEach(async function () {
  let signers = await ethers.getSigners()
  hostAddress = signers[2].address
  let treasuryAddress = signers[1].address

  let BookadotConfig = await ethers.getContractFactory('BookadotConfig')
  bookadotConfig = await BookadotConfig.deploy(
    500,
    24 * 60 * 60,
    treasuryAddress,
    ['0x9CAC127A2F2ea000D0AcBA03A2A52Be38F8ea3ec']
  )
  await bookadotConfig.deployed()

  const BookadotEIP712 = await ethers.getContractFactory('BookadotEIP712')
  const bookadotEIP712 = await BookadotEIP712.deploy()
  await bookadotEIP712.deployed()

  let BookadotFactory = await ethers.getContractFactory('BookadotFactory', {
    libraries: {
      BookadotEIP712: bookadotEIP712.address
    }
  })
  bookadotFactory = await BookadotFactory.deploy(bookadotConfig.address)
  await bookadotFactory.deployed()
})

describe('BookadotFactory', function () {
  describe('Verify deploying new property', function () {
    it('should deploy new property successfully', async function () {
      let deployPropertyTx = await bookadotFactory.deployProperty([propertyId], hostAddress)
      let deployPropertyTxResult = await deployPropertyTx.wait()

      await verifyDeployPropertyTransaction(deployPropertyTxResult)
    })

    it('only owner or backend be able to deploy new property', async function () {
      let signers = await ethers.getSigners()
      let newSigner = signers[1]
      let newSignerBookadotFactory = bookadotFactory.connect(newSigner)

      await expect(newSignerBookadotFactory.deployProperty([propertyId], hostAddress)).to.be.revertedWith('Factory: caller is not the owner or backend')

      /// update new Bookadot backend address
      let updateBackendTx = await bookadotConfig.updateBookadotBackend(newSigner.address)
      await updateBackendTx.wait()

      let deployPropertyTx = await newSignerBookadotFactory.deployProperty([propertyId], hostAddress)
      let deployPropertyTxResult = await deployPropertyTx.wait()

      await verifyDeployPropertyTransaction(deployPropertyTxResult)
    })
  })
  describe('Verify emitting event', async function () {
    it('only matching property can emit event', async function () {
      const bookingId = '8NLm0Mtyojl'

      await expect(bookadotFactory.book(bookingId)).to.be.revertedWith('Factory: Property not found')

      await expect(bookadotFactory.cancelByGuest(bookingId, 0, 0, 0, 12345678)).to.be.revertedWith('Factory: Property not found')

      await expect(bookadotFactory.cancelByHost(bookingId, 0, 12345678)).to.be.revertedWith('Factory: Property not found')

      await expect(bookadotFactory.payout(bookingId, 0, 0, 12345678, 1)).to.be.revertedWith('Factory: Property not found')
    })
  })
})

async function verifyDeployPropertyTransaction(transaction: any) {
  let events = transaction.events;
  let propertyCreatedEvent: Map<string, any>
  for (let event of events) {
    if (event['event'] === 'PropertyCreated') {
      propertyCreatedEvent = event;
      break;
    }
  }

  /// verify the existence of PropertyCreated event
  expect(propertyCreatedEvent).to.be.not.undefined
  expect(propertyCreatedEvent).to.be.not.null

  /// verify data of PropertyCreated event
  let propertyEventArgs = propertyCreatedEvent['args'];
  expect(propertyEventArgs['host']).to.equal(hostAddress)
  expect(propertyEventArgs['ids'][0]).to.equal(propertyId)

  /// verify new deployed property contract
  let propertyAddress = propertyEventArgs['properties'][0]
  let BookadotProperty = await ethers.getContractFactory('BookadotProperty')
  let bookadotProperty = BookadotProperty.attach(propertyAddress)
  expect(await bookadotProperty.id()).to.equal(propertyId)
}