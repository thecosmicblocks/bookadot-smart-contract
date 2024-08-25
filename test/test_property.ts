import { BookadotTicketFactory__factory } from './../build/types/factories/BookadotTicketFactory__factory';
import { BookadotTokenTest } from './../build/types/BookadotTokenTest';
import { BookadotProperty } from './../build/types/BookadotProperty';
import { expect, use } from 'chai'
import { ethers } from 'hardhat'
import { describe, it } from 'mocha'
import { solidity } from 'ethereum-waffle'
import { BigNumber, Contract, ContractReceipt, PayableOverrides } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BookadotConfig } from '../build/types/BookadotConfig';
import { BookadotFactory } from '../build/types/BookadotFactory';
import { BookadotTicketFactory } from '../build/types/BookadotTicketFactory';
import { BookingParametersStruct } from '../build/types/BookadotEIP712Test';
import { BookadotTicket } from '../build/types/BookadotTicket';
import { NATIVE_TOKEN } from '../helpers/consts';

use(solidity)

let bookadotProperty: BookadotProperty
let bookadotTicket: BookadotTicket
let bookadotConfig: BookadotConfig
let bookadotFactory: BookadotFactory
let bookadotTokenTest: BookadotTokenTest
let chainId: number
let treasuryAddress: string
let hostAddress: string
const propertyId = BigNumber.from(1)
let ticketData: string;

beforeEach(async function () {
    let signers = await ethers.getSigners()
    treasuryAddress = signers[1].address
    hostAddress = signers[2].address

    let BookadotTokenTest = await ethers.getContractFactory('BookadotTokenTest')
    bookadotTokenTest = await BookadotTokenTest.deploy(BigInt('1000000000000000000000000')) as BookadotTokenTest
    await bookadotTokenTest.deployed()

    let BookadotConfig = await ethers.getContractFactory('BookadotConfig')
    bookadotConfig = await BookadotConfig.deploy(
        500,
        24 * 60 * 60, // 1 day
        treasuryAddress,
        signers[0].address,
        [bookadotTokenTest.address],
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
    bookadotFactory = await BookadotFactory
        .deploy(bookadotConfig.address, bookadotTicketFactory.address) as BookadotFactory
    await bookadotFactory.deployed()

    let setFactoryTx = await bookadotTicketFactory.setFactory(bookadotFactory.address);
    await setFactoryTx.wait(1);

    ticketData = generateTicketData()

    let deployPropertyTx = await bookadotFactory
        .deployProperty([propertyId], hostAddress, ticketData)
    let deployPropertyTxResult = await deployPropertyTx.wait()

    bookadotProperty = await getDeployedPropertyContractFromTransaction(
        deployPropertyTxResult
    ) as BookadotProperty

    bookadotTicket = await getDeployedTicketContractFromTransaction(deployPropertyTxResult);

    chainId = (await ethers.provider.getNetwork()).chainId
})

describe('BookadotProperty', function () {
    describe('Verify book function', function () {
        it('Should book successfully with ERC20', async function () {
            const bookingId = '2hB2o789n'
            const bookingAmount = BigNumber.from('100000000000000000000')
            const signers = await ethers.getSigners()
            const backendSigner = signers[0]
            let { param, signature } = await generateBookingParam(bookingId, bookingAmount, backendSigner)
            let guestSigner = signers[3]

            await createBooking(guestSigner, bookingAmount, param, signature)
            expect(await bookadotTicket.ownerOf(1)).to.be.equal(guestSigner.address)

            let bookingData = await bookadotProperty.getBooking(bookingId)

            /// verify booking data on contract
            expect(bookingData).to.be.not.undefined
            expect(bookingData).to.be.not.null
            expect(bookingData.id).to.equal(bookingId)
            expect(bookingData.balance).to.equal(bookingAmount)
            expect(bookingData.token).to.equal(bookadotTokenTest.address)
            expect(bookingData.guest).to.equal(guestSigner.address)
            expect(bookingData.ticketId.toNumber()).to.equal(1)

            /// verify balance
            expect(await bookadotTokenTest.balanceOf(guestSigner.address)).to.equal(0)
            expect(await bookadotTokenTest.balanceOf(bookadotProperty.address)).to.equal(bookingAmount)
        })

        it('Should book successfully with Native', async function () {
            const bookingId = '2hz2o789n'
            const bookingAmount = BigNumber.from('100000000000000000000')
            const signers = await ethers.getSigners()
            const backendSigner = signers[0]

            await (
                await bookadotConfig.addSupportedToken(
                    NATIVE_TOKEN
                )
            ).wait()
            let { param, signature } = await generateBookingParam(bookingId, bookingAmount, backendSigner, NATIVE_TOKEN)
            let guestSigner = signers[3]

            await createBooking(guestSigner, bookingAmount, param, signature, {
                value: bookingAmount
            })
            expect(await bookadotTicket.ownerOf(1)).to.be.equal(guestSigner.address)

            let bookingData = await bookadotProperty.getBooking(bookingId)

            /// verify booking data on contract
            expect(bookingData).to.be.not.undefined
            expect(bookingData).to.be.not.null
            expect(bookingData.id).to.equal(bookingId)
            expect(bookingData.balance).to.equal(bookingAmount)
            expect(bookingData.token).to.equal(NATIVE_TOKEN)
            expect(bookingData.guest).to.equal(guestSigner.address)
            expect(bookingData.ticketId.toNumber()).to.equal(1)

            /// verify balance
            expect(await bookadotProperty.provider.getBalance(bookadotProperty.address)).to.equal(bookingAmount)
        })

        it('Should bulk book successfully', async function () {
            const bookingId0 = '2hB2o789n'
            const bookingAmount0 = BigNumber.from('100000000000000000000')
            const signers = await ethers.getSigners()
            const backendSigner = signers[0]
            let { param: param0, signature: signature0 } = await generateBookingParam(bookingId0, bookingAmount0, backendSigner)
            let guestSigner = signers[3]

            const bookingId1 = '1qdca2e2'
            const bookingAmount1 = BigNumber.from('100000000000000000000')

            await (
                await bookadotConfig.addSupportedToken(
                    NATIVE_TOKEN
                )
            ).wait()
            let { param: param1, signature: signature1 } = await generateBookingParam(bookingId1, bookingAmount1, backendSigner, NATIVE_TOKEN)

            await bulkCreateBooking(guestSigner, bookingAmount0, [param0, param1], [signature0, signature1], {
                value: bookingAmount1
            })

            let booking0Data = await bookadotProperty.getBooking(bookingId0)
            let booking1Data = await bookadotProperty.getBooking(bookingId1)
            expect(booking0Data).to.be.not.undefined
            expect(booking1Data).to.be.not.undefined
        })

        it('should revert because of invalid signature', async function () {
            const bookingId = '2hB2o789n'
            const bookingAmount = BigNumber.from('100000000000000000000')
            const signers = await ethers.getSigners()
            const backendSigner = signers[3]
            let { param, signature } = await generateBookingParam(bookingId, bookingAmount, backendSigner)
            let guestSigner = signers[3]

            /// faucet to guest account
            let faucetTx = await bookadotTokenTest.faucet(guestSigner.address, bookingAmount)
            await faucetTx.wait()

            /// use guest account to approve spending bookingAmount
            let approveTx = await (bookadotTokenTest.connect(guestSigner)).approve(bookadotProperty.address, bookingAmount)
            await approveTx.wait()

            await expect(bookadotProperty.connect(guestSigner).book(param, signature)).to.be.revertedWith('EIP712: unauthorized signer')
        })

        it('should revert because of insufficient allowance', async function () {
            const bookingId = '2hB2o789n'
            const bookingAmount = BigNumber.from('100000000000000000000')
            const signers = await ethers.getSigners()
            const backendSigner = signers[0]
            let { param, signature } = await generateBookingParam(bookingId, bookingAmount, backendSigner)
            let guestSigner = signers[3]

            /// faucet to guest account
            let faucetTx = await bookadotTokenTest.faucet(guestSigner.address, bookingAmount)
            await faucetTx.wait()

            expect(await bookadotTokenTest.balanceOf(guestSigner.address)).to.equal(bookingAmount)

            /// use guest account to approve spending bookingAmount / 2
            let approveTx = await (bookadotTokenTest.connect(guestSigner)).approve(bookadotProperty.address, bookingAmount.div(2))
            await approveTx.wait()

            await expect(bookadotProperty.connect(guestSigner).book(param, signature)).to.be.reverted
        })

        it('should revert because booking data is expired', async function () {
            const bookingId = '2hB2o789n'
            const bookingAmount = BigNumber.from('100000000000000000000')
            const signers = await ethers.getSigners()
            const backendSigner = signers[0]
            let { param, signature } = await generateBookingParam(bookingId, bookingAmount, backendSigner)
            let guestSigner = signers[3]

            /// faucet to guest account
            let faucetTx = await bookadotTokenTest.faucet(guestSigner.address, bookingAmount)
            await faucetTx.wait()

            expect(await bookadotTokenTest.balanceOf(guestSigner.address)).to.equal(bookingAmount)

            /// use guest account to approve spending bookingAmount
            let approveTx = await (bookadotTokenTest.connect(guestSigner)).approve(bookadotProperty.address, bookingAmount)
            await approveTx.wait()


            const oneDayDuration = 24 * 60 * 60 // second
            await increaseBlockTimestamp(2 * oneDayDuration)

            await expect(bookadotProperty.connect(guestSigner).book(param, signature)).to.be.revertedWith('Property: Booking data is expired')

            await resetBlockTimestamp()
        })

        it('should revert because token is not whitelisted', async function () {
            const bookingId = '2hB2o789n'
            const bookingAmount = BigNumber.from('100000000000000000000')
            const signers = await ethers.getSigners()
            const backendSigner = signers[0]
            let { param, signature } = await generateBookingParam(bookingId, bookingAmount, backendSigner, '0x9CAC127A2F2ea000D0AcBA03A2A52Be38F8ea3ec')
            let guestSigner = signers[3]

            /// faucet to guest account
            let faucetTx = await bookadotTokenTest.faucet(guestSigner.address, bookingAmount)
            await faucetTx.wait()

            expect(await bookadotTokenTest.balanceOf(guestSigner.address)).to.equal(bookingAmount)

            /// use guest account to approve spending bookingAmount
            let approveTx = await (bookadotTokenTest.connect(guestSigner)).approve(bookadotProperty.address, bookingAmount)
            await approveTx.wait()

            await expect(bookadotProperty.connect(guestSigner).book(param, signature)).to.be.revertedWith('Property: Token is not whitelisted')
        })
    })

    describe('Verify cancel function', function () {
        it('should cancel successfully with full refund before free cancellation milestone', async function () {
            const bookingId = '2hB2o789n'
            const bookingAmount = BigNumber.from('100000000000000000000')
            const signers = await ethers.getSigners()
            const backendSigner = signers[0]
            let { param, signature } = await generateBookingParam(bookingId, bookingAmount, backendSigner)
            let guestSigner = signers[3]

            await createBooking(guestSigner, bookingAmount, param, signature)

            /// before cancel
            expect(await bookadotTokenTest.balanceOf(guestSigner.address)).to.equal(0)

            /// call cancel
            let cancelTx = await (bookadotProperty.connect(guestSigner)).cancel(bookingId)
            await cancelTx.wait()

            /// after cancel, should be refunded all of bookingAmount
            expect(await bookadotTokenTest.balanceOf(guestSigner.address)).to.equal(bookingAmount)
            expect(await bookadotTokenTest.balanceOf(bookadotProperty.address)).to.equal(0)

            /// verify booking data
            let bookingData = await bookadotProperty.getBooking(bookingId)
            expect(bookingData.balance).to.equal(0)
            expect(bookingData.status).to.equal(3)
        })

        it('should cancel successfully with partial refund after first cancellation milestone', async function () {
            const bookingId = '2hB2o789n'
            const bookingAmount = BigNumber.from('100000000000000000000')
            const signers = await ethers.getSigners()
            const backendSigner = signers[0]
            let { param, signature } = await generateBookingParam(bookingId, bookingAmount, backendSigner)
            let guestSigner = signers[3]

            await createBooking(guestSigner, bookingAmount, param, signature)

            /// before cancel
            expect(await bookadotTokenTest.balanceOf(guestSigner.address)).to.equal(0)

            const oneDayDuration = 24 * 60 * 60 * 1000 // millisecond
            let now = new Date()
            now.setUTCHours(0, 0, 0, 0)

            let freeCancellationDate = new Date()
            freeCancellationDate.setTime(now.getTime() + oneDayDuration) // free cancallation milestone

            let triggerCancellationDate = new Date()
            triggerCancellationDate.setTime(freeCancellationDate.getTime() + 0.5 * oneDayDuration)
            let diffFromNow = triggerCancellationDate.getTime() - (new Date()).getTime() // millisecond

            await increaseBlockTimestamp(Math.round(diffFromNow / 1000))

            /// call cancel
            let cancelTx = await (bookadotProperty.connect(guestSigner)).cancel(bookingId)
            await cancelTx.wait()

            /// after cancel
            let guestAmount = bookingAmount.div(2)
            let treasuryAmount = (bookingAmount.sub(guestAmount)).mul(500).div(10000)
            let hostAmount = bookingAmount.sub(guestAmount).sub(treasuryAmount)
            expect(await bookadotTokenTest.balanceOf(guestSigner.address)).to.equal(guestAmount)
            expect(await bookadotTokenTest.balanceOf(treasuryAddress)).to.equal(treasuryAmount)
            expect(await bookadotTokenTest.balanceOf(hostAddress)).to.equal(hostAmount)
            expect(await bookadotTokenTest.balanceOf(bookadotProperty.address)).to.equal(0)

            /// verify booking data
            let bookingData = await bookadotProperty.getBooking(bookingId)
            expect(bookingData.balance).to.equal(0)
            expect(bookingData.status).to.equal(3)

            await resetBlockTimestamp()
        })

        it('should cancel successfully without refund after last cancellation milestone', async function () {
            const bookingId = '2hB2o789n'
            const bookingAmount = BigNumber.from('100000000000000000000')
            const signers = await ethers.getSigners()
            const backendSigner = signers[0]
            let { param, signature } = await generateBookingParam(bookingId, bookingAmount, backendSigner)
            let guestSigner = signers[3]

            await createBooking(guestSigner, bookingAmount, param, signature)

            /// before cancel
            expect(await bookadotTokenTest.balanceOf(guestSigner.address)).to.equal(0)

            const oneDayDuration = 24 * 60 * 60 * 1000 // millisecond
            let now = new Date()
            now.setUTCHours(0, 0, 0, 0)

            let finalCancellationDate = new Date()
            finalCancellationDate.setTime(now.getTime() + 2 * oneDayDuration)

            let triggerCancellationDate = new Date()
            triggerCancellationDate.setTime(finalCancellationDate.getTime() + 0.5 * oneDayDuration)
            let diffFromNow = triggerCancellationDate.getTime() - (new Date()).getTime() // millisecond

            await increaseBlockTimestamp(Math.round(diffFromNow / 1000))

            /// call cancel
            let cancelTx = await (bookadotProperty.connect(guestSigner)).cancel(bookingId)
            await cancelTx.wait()

            /// after cancel
            let guestAmount = BigNumber.from(0)
            let treasuryAmount = (bookingAmount.sub(guestAmount)).mul(500).div(10000)
            let hostAmount = bookingAmount.sub(guestAmount).sub(treasuryAmount)
            expect(await bookadotTokenTest.balanceOf(guestSigner.address)).to.equal(0)
            expect(await bookadotTokenTest.balanceOf(treasuryAddress)).to.equal(treasuryAmount)
            expect(await bookadotTokenTest.balanceOf(hostAddress)).to.equal(hostAmount)
            expect(await bookadotTokenTest.balanceOf(bookadotProperty.address)).to.equal(0)

            /// verify booking data
            let bookingData = await bookadotProperty.getBooking(bookingId)
            expect(bookingData.balance).to.equal(0)
            expect(bookingData.status).to.equal(3)

            await resetBlockTimestamp()
        })

        it('should revert because only guest be able to call cancel', async function () {
            const bookingId = '2hB2o789n'
            const bookingAmount = BigNumber.from('100000000000000000000')
            const signers = await ethers.getSigners()
            const backendSigner = signers[0]
            let { param, signature } = await generateBookingParam(bookingId, bookingAmount, backendSigner)
            let guestSigner = signers[3]

            await createBooking(guestSigner, bookingAmount, param, signature)

            /// user new guest account to call cancel
            let newGuestSigner = signers[4]
            await expect(bookadotProperty.connect(newGuestSigner).cancel(bookingId)).to.be.revertedWith('Property: Only the guest can cancel the booking')
        })

        it('should revert because the booking is already cancelled', async function () {
            const bookingId = '2hB2o789n'
            const bookingAmount = BigNumber.from('100000000000000000000')
            const signers = await ethers.getSigners()
            const backendSigner = signers[0]
            let { param, signature } = await generateBookingParam(bookingId, bookingAmount, backendSigner)
            let guestSigner = signers[3]

            await createBooking(guestSigner, bookingAmount, param, signature)

            /// before cancel
            expect(await bookadotTokenTest.balanceOf(guestSigner.address)).to.equal(0)

            /// call cancel
            let cancelTx = await (bookadotProperty.connect(guestSigner)).cancel(bookingId)
            await cancelTx.wait()

            /// call cancel again
            await expect(bookadotProperty.connect(guestSigner).cancel(bookingId)).to.be.revertedWith('Property: Booking is already cancelled or paid out')
        })

        it('should revert because the booking is not found', async function () {
            const bookingId = '2hB2o789n'
            const bookingAmount = BigNumber.from('100000000000000000000')
            const signers = await ethers.getSigners()
            const backendSigner = signers[0]
            let { param, signature } = await generateBookingParam(bookingId, bookingAmount, backendSigner)
            let guestSigner = signers[3]

            await createBooking(guestSigner, bookingAmount, param, signature)

            /// before cancel
            expect(await bookadotTokenTest.balanceOf(guestSigner.address)).to.equal(0)

            /// call cancel
            await expect(bookadotProperty.connect(guestSigner).cancel('mY8tjKm02T')).to.be.revertedWith('Property: Booking does not exist')
        })
    })

    describe('Verify payout function', function () {
        it('should payout successfully with valid call', async function () {
            const bookingId = '2hB2o789n'
            const bookingAmount = BigNumber.from('100000000000000000000')
            const signers = await ethers.getSigners()
            const backendSigner = signers[0]
            let { param, signature } = await generateBookingParam(bookingId, bookingAmount, backendSigner)
            let guestSigner = signers[3]

            await createBooking(guestSigner, bookingAmount, param, signature)

            const oneDayDuration = 24 * 60 * 60 * 1000 // millisecond
            const delayPayoutDuration = oneDayDuration
            let now = new Date()
            now.setUTCHours(0, 0, 0, 0)

            let freeCancellationDate = new Date()
            freeCancellationDate.setTime(now.getTime() + oneDayDuration) // free cancallation milestone

            let triggerPartialPayoutDate = new Date()
            triggerPartialPayoutDate.setTime(freeCancellationDate.getTime() + 0.5 * oneDayDuration + delayPayoutDuration)
            let diffFromNow = triggerPartialPayoutDate.getTime() - (new Date()).getTime() // millisecond

            await increaseBlockTimestamp(Math.round(diffFromNow / 1000))

            /// call partial payout
            let payoutTx = await bookadotProperty.payout(bookingId)
            await payoutTx.wait()

            /// verify balances
            let toBePaid = bookingAmount.div(2)
            let treasuryAmount = toBePaid.mul(500).div(10000)
            let hostAmount = toBePaid.sub(treasuryAmount)
            let remainBookingBalance = bookingAmount.sub(toBePaid)
            expect(await bookadotTokenTest.balanceOf(hostAddress)).to.equal(hostAmount)
            expect(await bookadotTokenTest.balanceOf(treasuryAddress)).to.equal(treasuryAmount)
            expect(await bookadotTokenTest.balanceOf(guestSigner.address)).to.equal(0)
            expect(await bookadotTokenTest.balanceOf(bookadotProperty.address)).to.equal(remainBookingBalance)

            /// verify booking data
            let bookingData = await bookadotProperty.getBooking(bookingId)
            expect(bookingData.balance).to.equal(remainBookingBalance)
            expect(bookingData.status).to.equal(1)

            let finalCancellationDate = new Date()
            finalCancellationDate.setTime(now.getTime() + 2 * oneDayDuration)

            let triggerFullPayoutDate = new Date()
            triggerFullPayoutDate.setTime(finalCancellationDate.getTime() + 0.5 * oneDayDuration + delayPayoutDuration)
            diffFromNow = triggerFullPayoutDate.getTime() - (new Date()).getTime()

            await increaseBlockTimestamp(Math.round(diffFromNow / 1000))

            /// call full payout
            payoutTx = await bookadotProperty.payout(bookingId)
            payoutTx.wait()

            toBePaid = remainBookingBalance
            let newTreasuryAmount = toBePaid.mul(500).div(10000)
            let newHostAmount = toBePaid.sub(newTreasuryAmount)
            expect(await bookadotTokenTest.balanceOf(hostAddress)).to.equal(newHostAmount.add(hostAmount))
            expect(await bookadotTokenTest.balanceOf(treasuryAddress)).to.equal(newTreasuryAmount.add(treasuryAmount))
            expect(await bookadotTokenTest.balanceOf(guestSigner.address)).to.equal(0)
            expect(await bookadotTokenTest.balanceOf(bookadotProperty.address)).to.equal(0)

            /// verify booking data
            bookingData = await bookadotProperty.getBooking(bookingId)
            expect(bookingData.balance).to.equal(0)
            expect(bookingData.status).to.equal(2)

            /// cannot call payout if the booking is fulfill
            await expect(bookadotProperty.payout(bookingId)).to.be.revertedWith('Property: Booking is already cancelled or fully paid out')

            await resetBlockTimestamp()
        })

        it('should revert because of calling before payout milestone', async function () {
            const bookingId = '2hB2o789n'
            const bookingAmount = BigNumber.from('100000000000000000000')
            const signers = await ethers.getSigners()
            const backendSigner = signers[0]
            let { param, signature } = await generateBookingParam(bookingId, bookingAmount, backendSigner)
            let guestSigner = signers[3]

            await createBooking(guestSigner, bookingAmount, param, signature)

            await expect(bookadotProperty.payout(bookingId)).to.be.revertedWith('Property: Invalid payout call')
        })
        it('should revert because of calling with wrong bookingId', async function () {
            const bookingId = '2hB2o789n'
            const bookingAmount = BigNumber.from('100000000000000000000')
            const signers = await ethers.getSigners()
            const backendSigner = signers[0]
            let { param, signature } = await generateBookingParam(bookingId, bookingAmount, backendSigner)
            let guestSigner = signers[3]

            await createBooking(guestSigner, bookingAmount, param, signature)

            await expect(bookadotProperty.payout('mY8tjKm02T')).to.be.revertedWith('Property: Booking does not exist')
        })
    })

    describe('Verify cancelByHost function', function () {
        it('should cancel by host successfully with valid call', async function () {
            const bookingId = '2hB2o789n'
            const bookingAmount = BigNumber.from('100000000000000000000')
            const signers = await ethers.getSigners()
            const backendSigner = signers[0]
            let { param, signature } = await generateBookingParam(bookingId, bookingAmount, backendSigner)
            let guestSigner = signers[3]
            let hostSigner = signers[2]

            await createBooking(guestSigner, bookingAmount, param, signature)

            let cancelByHostTx = await bookadotProperty.connect(hostSigner).cancelByHost(bookingId)
            await cancelByHostTx.wait()

            /// verify balances
            expect(await bookadotTokenTest.balanceOf(guestSigner.address)).to.equal(bookingAmount)
            expect(await bookadotTokenTest.balanceOf(hostAddress)).to.equal(0)
            expect(await bookadotTokenTest.balanceOf(bookadotProperty.address)).to.equal(0)

            /// verify data
            let bookingData = await bookadotProperty.getBooking(bookingId)
            expect(bookingData.balance).to.equal(0)
            expect(bookingData.status).to.equal(4)
        })

        it("should cancel by host's delegator successfully with valid call", async function () {
            const bookingId = '2hB2o789n'
            const bookingAmount = BigNumber.from('100000000000000000000')
            const signers = await ethers.getSigners()
            const backendSigner = signers[0]
            let { param, signature } = await generateBookingParam(bookingId, bookingAmount, backendSigner)
            let guestSigner = signers[3]
            let hostSigner = signers[2]
            let delegatorSigner = signers[4]

            await createBooking(guestSigner, bookingAmount, param, signature)

            /// approve delegator
            let approveDelegatorTx = await bookadotProperty.connect(hostSigner).approve(delegatorSigner.address)
            await approveDelegatorTx.wait()

            let cancelByHostTx = await bookadotProperty.connect(delegatorSigner).cancelByHost(bookingId)
            await cancelByHostTx.wait()

            /// verify balances
            expect(await bookadotTokenTest.balanceOf(guestSigner.address)).to.equal(bookingAmount)
            expect(await bookadotTokenTest.balanceOf(hostAddress)).to.equal(0)
            expect(await bookadotTokenTest.balanceOf(bookadotProperty.address)).to.equal(0)

            /// verify data
            let bookingData = await bookadotProperty.getBooking(bookingId)
            expect(bookingData.balance).to.equal(0)
            expect(bookingData.status).to.equal(4)
        })

        it('should revert because only host be able to call this function', async function () {
            const bookingId = '2hB2o789n'
            const bookingAmount = BigNumber.from('100000000000000000000')
            const signers = await ethers.getSigners()
            const backendSigner = signers[0]
            let { param, signature } = await generateBookingParam(bookingId, bookingAmount, backendSigner)
            let guestSigner = signers[3]

            await createBooking(guestSigner, bookingAmount, param, signature)

            await expect(bookadotProperty.connect(guestSigner).cancelByHost(bookingId)).to.be.revertedWith("Property: Only the host or a host's delegate is authorized to call this action")
        })

        it("should revert because delegator is already revoked", async function () {
            const bookingAmount = BigNumber.from('100000000000000000000')
            const signers = await ethers.getSigners()
            const backendSigner = signers[0]
            let guestSigner = signers[3]
            let hostSigner = signers[2]
            let delegatorSigner = signers[4]

            const bookingId0 = '2hB2o789n'
            var { param, signature } = await generateBookingParam(bookingId0, bookingAmount, backendSigner)
            await createBooking(guestSigner, bookingAmount, param, signature)

            /// approve delegator
            let approveDelegatorTx = await bookadotProperty.connect(hostSigner).approve(delegatorSigner.address)
            await approveDelegatorTx.wait()

            let cancelByHostTx = await bookadotProperty.connect(delegatorSigner).cancelByHost(bookingId0)
            await cancelByHostTx.wait()

            /// verify delegator call cancel sucessfully at first
            let bookingData0 = await bookadotProperty.getBooking(bookingId0)
            expect(bookingData0.status).to.equal(4)

            /// revoke delegator
            let revokeDelegatorTx = await bookadotProperty.connect(hostSigner).revoke(delegatorSigner.address)
            await revokeDelegatorTx.wait()

            /// create other booking
            const bookingId1 = '8Km3Mh9lK'
            var { param, signature } = await generateBookingParam(bookingId1, bookingAmount, backendSigner)
            await createBooking(guestSigner, bookingAmount, param, signature)

            await expect(bookadotProperty.connect(delegatorSigner).cancelByHost(bookingId1)).to.be.revertedWith("Property: Only the host or a host's delegate is authorized to call this action")
        })
    })

    describe('Verify utility functions', function () {
        it('should get correct total booking', async function () {
            /// there should be no booking in the beginning
            expect(await bookadotProperty.totalBooking()).to.equal(0)

            /// create a new booking
            const bookingId = '2hB2o789n'
            const bookingAmount = BigNumber.from('100000000000000000000')
            const signers = await ethers.getSigners()
            const backendSigner = signers[0]
            let { param, signature } = await generateBookingParam(bookingId, bookingAmount, backendSigner)
            let guestSigner = signers[3]

            await createBooking(guestSigner, bookingAmount, param, signature)

            /// there should be one booking now
            expect(await bookadotProperty.totalBooking()).to.equal(1)
        })

        it('should get correct index of booking', async function () {
            const bookingAmount = BigNumber.from('100000000000000000000')
            const signers = await ethers.getSigners()
            const backendSigner = signers[0]
            const guestSigner = signers[3]

            const bookingId0 = '2hB2o789n'
            var { param, signature } = await generateBookingParam(bookingId0, bookingAmount, backendSigner)

            await createBooking(guestSigner, bookingAmount, param, signature)

            expect(await bookadotProperty.getBooking(bookingId0)).not.to.be.null;

            const bookingId1 = 'M9tH0m2Ld'
            var { param, signature } = await generateBookingParam(bookingId1, bookingAmount, backendSigner)

            await createBooking(guestSigner, bookingAmount, param, signature)

            expect(await bookadotProperty.getBooking(bookingId1)).not.to.be.null;
        })
    })
})

async function getDeployedPropertyContractFromTransaction(transaction: ContractReceipt): Promise<Contract> {
    let events = transaction.events;
    let propertyCreatedEvent = events.find((e) => e.event === 'PropertyCreated')
    let propertyEventArgs = propertyCreatedEvent['args']
    let propertyAddress = propertyEventArgs['properties'][0]

    let BookadotProperty = await ethers.getContractFactory('BookadotProperty')
    let bookadotProperty = BookadotProperty.attach(propertyAddress)
    return bookadotProperty
}

async function getDeployedTicketContractFromTransaction(transaction: ContractReceipt): Promise<BookadotTicket> {
    let events = transaction.events;
    let bookadotTicketFactoryFactory = BookadotTicketFactory__factory.createInterface();

    for (let i = 0; i < events.length; i++) {
        const e = events[i];
        try {
            return (await ethers.getContractFactory('BookadotTicket'))
                .attach(
                    bookadotTicketFactoryFactory
                        .decodeEventLog('TicketCreated', e.data)['ticketAddress']
                ) as BookadotTicket;
        } catch (error) {
            continue;
        }
    }
    return undefined;
}

async function generateBookingParam(
    bookingId: string,
    bookingAmount: BigNumber,
    signer: SignerWithAddress,
    token?: string
): Promise<{ param: BookingParametersStruct, signature: string }> {
    const oneDayDuration = 24 * 60 * 60 * 1000 // millisecond

    let now = new Date()
    now.setUTCHours(0, 0, 0, 0)

    let freeCancellationDate = new Date()
    freeCancellationDate.setTime(now.getTime() + oneDayDuration) // free cancallation milestone
    let freeCancellationTimestamp = Math.round(freeCancellationDate.getTime() / 1000)

    let checkInDate = new Date()
    checkInDate.setTime(now.getTime() + 2 * oneDayDuration)
    let checkInTimestamp = Math.round(checkInDate.getTime() / 1000)

    let checkOutDate = new Date()
    checkOutDate.setTime(now.getTime() + 3 * oneDayDuration)
    let checkOutTimestamp = Math.round(checkOutDate.getTime() / 1000)

    const domain = {
        name: 'Bookadot',
        version: '1',
        chainId: chainId,
        verifyingContract: bookadotProperty.address,
    }

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

    const data = {
        token: token ?? bookadotTokenTest.address,
        bookingId: bookingId,
        checkInTimestamp: checkInTimestamp,
        checkOutTimestamp: checkOutTimestamp,
        bookingExpirationTimestamp: checkInTimestamp,
        bookingAmount: bookingAmount,
        cancellationPolicies: [
            {
                expiryTime: freeCancellationTimestamp,
                refundAmount: bookingAmount,
            },
            {
                expiryTime: checkInTimestamp,
                refundAmount: bookingAmount.div(2),
            },
        ],
    }

    let signature = await signer._signTypedData(domain, types, data)

    return { param: data, signature: signature }
}

async function createBooking(
    guestSigner: SignerWithAddress,
    bookingAmount: BigNumber,
    param: BookingParametersStruct,
    signature: string,
    overrides?: PayableOverrides & { from?: string | Promise<string> }
): Promise<ContractReceipt> {
    /// faucet to guest account
    let faucetTx = await bookadotTokenTest.faucet(guestSigner.address, bookingAmount)
    await faucetTx.wait()

    /// use guest account to approve spending bookingAmount
    let approveTx = await (bookadotTokenTest.connect(guestSigner)).approve(bookadotProperty.address, bookingAmount)
    await approveTx.wait()

    /// use guest account to call booking
    const params = [param, signature] as any[]
    if (overrides) {
        params.push(overrides)
    }
    // @ts-ignore
    let bookingTx = await bookadotProperty.connect(guestSigner).book(...params)
    return bookingTx.wait()
}

async function bulkCreateBooking(
    guestSigner: SignerWithAddress,
    bookingAmount: BigNumber,
    param: BookingParametersStruct[],
    signature: string[],
    overrides?: PayableOverrides & { from?: string | Promise<string> }
): Promise<ContractReceipt> {
    /// faucet to guest account
    let faucetTx = await bookadotTokenTest.faucet(guestSigner.address, bookingAmount)
    await faucetTx.wait()

    /// use guest account to approve spending bookingAmount
    let approveTx = await (bookadotTokenTest.connect(guestSigner)).approve(bookadotProperty.address, bookingAmount)
    await approveTx.wait()

    /// use guest account to call booking
    const params = [param, signature] as any[]
    if (overrides) {
        params.push(overrides)
    }
    // @ts-ignore
    let bookingTx = await bookadotProperty.connect(guestSigner).bulkBook(...params)
    return bookingTx.wait()
}

async function increaseBlockTimestamp(duration: number) {
    await ethers.provider.send('evm_increaseTime', [duration])
    await ethers.provider.send("evm_mine", [])
}

async function resetBlockTimestamp() {
    const blockNumber = ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNumber);
    const currentTimestamp = Math.floor(new Date().getTime() / 1000);
    const secondsDiff = currentTimestamp - block.timestamp;
    await ethers.provider.send('evm_increaseTime', [secondsDiff]);
    await ethers.provider.send('evm_mine', []);
}

function generateTicketData(
): string {
    const type = [
        'string', // _nftName
        'string', // _nftSymbol
        'string', // _baseUri
        'address', // _owner
        'address', // _transferable
        // 'address', // _operator
    ]

    const value = [
        "Bookadot First Event",
        "BFE",
        "https://www.example.com/",
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        // bookadotPropertyAddr,
    ]

    return ethers.utils.defaultAbiCoder.encode(
        type,
        value
    )
}
