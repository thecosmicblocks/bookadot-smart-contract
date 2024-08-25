import { BookadotFactory } from './../build/types/BookadotFactory';
import { expect, use } from 'chai'
import { ethers } from 'hardhat'
import { describe, it } from 'mocha'
import { solidity } from 'ethereum-waffle'
import { BigNumber, Contract, ContractReceipt, Event, Wallet } from 'ethers'
import { BookadotConfig } from '../build/types/BookadotConfig'
import { BookadotTicketFactory } from '../build/types/BookadotTicketFactory';

use(solidity)

let bookadotConfig: BookadotConfig
let bookadotFactory: BookadotFactory
let hostAddress: string
const propertyId = BigNumber.from(1)
const ticketData = generateTicketData()

beforeEach(async function () {
    let signers = await ethers.getSigners()
    hostAddress = signers[2].address
    let treasuryAddress = signers[1].address

    let BookadotConfig = await ethers.getContractFactory('BookadotConfig')
    bookadotConfig = await BookadotConfig.deploy(
        500,
        24 * 60 * 60,
        treasuryAddress,
        signers[0].address,
        ['0x9CAC127A2F2ea000D0AcBA03A2A52Be38F8ea3ec']
    ) as BookadotConfig
    await bookadotConfig.deployed()

    const BookadotEIP712 = await ethers.getContractFactory('BookadotEIP712')
    const bookadotEIP712 = await BookadotEIP712.deploy()
    await bookadotEIP712.deployed()

    const BookadotTicketFactory = await ethers.getContractFactory('BookadotTicketFactory')
    const bookadotTicketFactory = await BookadotTicketFactory.deploy() as BookadotTicketFactory
    await bookadotTicketFactory.deployed()

    let BookadotFactory = await ethers.getContractFactory('BookadotFactory', {
        libraries: {
            BookadotEIP712: bookadotEIP712.address
        }
    })
    bookadotFactory = await BookadotFactory.deploy(
        bookadotConfig.address,
        bookadotTicketFactory.address
    ) as BookadotFactory
    await bookadotFactory.deployed()

    const setFactoryTx = await bookadotTicketFactory.setFactory(bookadotFactory.address);
    await setFactoryTx.wait(1);
})

describe('BookadotFactory', function () {
    describe('Verify deploying new property', function () {
        it('should deploy new property successfully', async function () {
            let deployPropertyTx = await bookadotFactory
                .deployProperty([propertyId], hostAddress, ticketData)
            let deployPropertyTxResult = await deployPropertyTx.wait()

            await verifyDeployPropertyTransaction(deployPropertyTxResult)
        })

        it('only owner or backend be able to deploy new property', async function () {
            let signers = await ethers.getSigners()
            let newSigner = signers[1]
            let newSignerBookadotFactory = bookadotFactory.connect(newSigner)

            await expect(newSignerBookadotFactory
                .deployProperty([propertyId], hostAddress, ticketData)
            ).to.be.revertedWith('Factory: caller is not the owner or operator')

            /// update new Bookadot backend address
            let updateBackendTx = await bookadotConfig.updateBookadotSigner(newSigner.address)
            await updateBackendTx.wait()

            let deployPropertyTx = await newSignerBookadotFactory.deployProperty(
                [propertyId],
                hostAddress,
                ticketData
            )
            let deployPropertyTxResult = await deployPropertyTx.wait()

            await verifyDeployPropertyTransaction(deployPropertyTxResult)
        })
    })

    describe('Verify emitting event', async function () {
        it('only matching property can emit event', async function () {
            const bookingId = '8NLm0Mtyojl'

            await expect(
                bookadotFactory.book({
                    token: ethers.constants.AddressZero,
                    id: bookingId,
                    ticketId: 1,
                    checkInTimestamp: 12345678,
                    checkOutTimestamp: 12345678,
                    status: 1,
                    balance: BigInt("123123123123312312312"),
                    guest: hostAddress,
                    cancellationPolicies: [
                        {
                            expiryTime: 123123123123,
                            refundAmount: 123123123,
                        },
                        {
                            expiryTime: 123123123123,
                            refundAmount: 12312312312,
                        },
                    ],
                })
            ).to.be.revertedWith('Factory: Property not found')

            await expect(
                bookadotFactory.cancelByGuest(bookingId, 0, 0, 0, 12345678)
            ).to.be.revertedWith('Factory: Property not found')

            await expect(
                bookadotFactory.cancelByHost(bookingId, 0, 12345678)
            ).to.be.revertedWith('Factory: Property not found')

            await expect(
                bookadotFactory.payout(bookingId, 0, 0, 12345678, 1)
            ).to.be.revertedWith('Factory: Property not found')
        })
    })
})

async function verifyDeployPropertyTransaction(transaction: ContractReceipt) {
    let events = transaction.events;
    let propertyCreatedEvent: Event = events.find((e) => e.event === 'PropertyCreated')

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

function generateTicketData(): string {
    const type = [
        'string', // _nftName
        'string', // _nftSymbol
        'string', // _baseUri
        'address', // _minter
        'address', // _owner
        'address', // _transferable
    ]

    const value = [
        "Bookadot First Event",
        "BFE",
        "https://www.example.com/",
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
    ]

    return ethers.utils.defaultAbiCoder.encode(
        type,
        value
    )
}