import { BookadotConfig } from './../build/types/BookadotConfig';
import { expect, use } from 'chai'
import { ethers } from 'hardhat'
import { describe, it } from 'mocha'
import { solidity } from 'ethereum-waffle'
import { Contract } from 'ethers'

use(solidity)

let bookadotConfig: BookadotConfig
let treasuryAddress: string
const zeroAddress = ethers.constants.AddressZero;
const tokenAddress = '0x9CAC127A2F2ea000D0AcBA03A2A52Be38F8ea3ec'

beforeEach(async function () {
    let signers = await ethers.getSigners()
    treasuryAddress = signers[1].address

    let BookadotConfig = await ethers.getContractFactory('BookadotConfig')
    bookadotConfig = await BookadotConfig.deploy(
        500,
        24 * 60 * 60,
        treasuryAddress,
        signers[0].address,
        [tokenAddress]
    ) as unknown as BookadotConfig
    await bookadotConfig.deployed()
})

describe('BookadotConfig', function () {
    describe('Verify initial config', function () {
        it('initialize with valid fee', async function () {
            expect(await bookadotConfig.fee()).to.equal(500)
        })

        it('initialize with valid payout delay', async function () {
            expect(await bookadotConfig.payoutDelayTime()).to.equal(24 * 60 * 60)
        })

        it('intialize with valid Bookadot treasury address', async function () {
            expect(await bookadotConfig.bookadotTreasury()).to.equal(treasuryAddress)
        })

        it('initialize with valid supported token', async function () {
            expect(await bookadotConfig.supportedTokens(tokenAddress)).true
        })

        it('intialize with valid Bookadot backend address', async function () {
            let signers = await ethers.getSigners()
            let defaultSignerAddress = signers[0].address
            expect(await bookadotConfig.bookadotSigner()).to.equal(defaultSignerAddress)
        })
    })

    describe('Verify updating fee', function () {
        it('should update fee with valid value', async function () {
            let updateFeeTx = await bookadotConfig.updateFee(600)
            await updateFeeTx.wait()

            expect(await bookadotConfig.fee()).to.equal(600)
        })

        it('should not update fee with invalid value', async function () {
            await expect(bookadotConfig.updateFee(3000)).to.be.revertedWith('Config: Fee must be between 0 and 2000')
        })

        it('only owner be able to update fee', async function () {
            let newSignerBookadotConfig = await connectContractToNewSigner(bookadotConfig)

            await expect(newSignerBookadotConfig.updateFee(600)).to.be.revertedWith('Ownable: caller is not the owner')
        })
    })

    describe('Verify update deplay duration of payout', function () {
        it('should update deplay duration sucessfully', async function () {
            let updateDelayDurationTx = await bookadotConfig.updatePayoutDelayTime(2 * 24 * 60 * 60)
            await updateDelayDurationTx.wait()

            expect(await bookadotConfig.payoutDelayTime()).to.equal(2 * 24 * 60 * 60)
        })

        it('only owner be able to update deply duration', async function () {
            let newSignerBookadotConfig = await connectContractToNewSigner(bookadotConfig)

            await expect(newSignerBookadotConfig.updatePayoutDelayTime(24 * 60 * 60)).to.be.revertedWith('Ownable: caller is not the owner')
        })
    })

    describe('Verify updating supported tokens', function () {
        it('should update supported token with valid value', async function () {
            const tokenAddress = '0x8Daeff86528910afaB7fBF5b6287360d33aAFDC8'
            let updateTokenTx = await bookadotConfig.addSupportedToken(tokenAddress)
            await updateTokenTx.wait()

            expect(await bookadotConfig.supportedTokens(tokenAddress)).true
        })

        it('should not update token with zero address', async function () {
            await expect(bookadotConfig.addSupportedToken(zeroAddress)).to.be.revertedWith('Config: token is zero address')
        })

        it('remove a supported token', async function () {
            const tokenAddress = '0x8Daeff86528910afaB7fBF5b6287360d33aAFDC8'
            let updateTokenTx = await bookadotConfig.addSupportedToken(tokenAddress)
            await updateTokenTx.wait()

            expect(await bookadotConfig.supportedTokens(tokenAddress)).true

            let removeTokenTx = await bookadotConfig.removeSupportedToken(tokenAddress)
            await removeTokenTx.wait()

            expect(await bookadotConfig.supportedTokens(tokenAddress)).false
        })

        it('only owner be able to update supported token', async function () {
            let newSignerBookadotConfig = await connectContractToNewSigner(bookadotConfig)

            await expect(newSignerBookadotConfig.addSupportedToken('0x8Daeff86528910afaB7fBF5b6287360d33aAFDC8')).to.be.revertedWith('Ownable: caller is not the owner')

            await expect(newSignerBookadotConfig.removeSupportedToken('0x8Daeff86528910afaB7fBF5b6287360d33aAFDC8')).to.be.revertedWith('Ownable: caller is not the owner')
        })
    })

    describe('Verify updating Bookadot treasury address', function () {
        it('should update Bookadot treasury address with valid value', async function () {
            let signers = await ethers.getSigners()
            const newTreasurAddress = signers[2].address

            let updateTreasuryTx = await bookadotConfig.updateTreasury(newTreasurAddress)
            await updateTreasuryTx.wait()

            expect(await bookadotConfig.bookadotTreasury()).to.equal(newTreasurAddress)
        })

        it('should not update Bookadot treasury address with zero address', async function () {
            await expect(bookadotConfig.updateTreasury(zeroAddress)).to.be.revertedWith('Config: treasury is zero address')
        })

        it('only owner be able to update Bookadot treasury address', async function () {
            let signers = await ethers.getSigners()
            const newTreasurAddress = signers[2].address

            let newSignerBookadotConfig = await connectContractToNewSigner(bookadotConfig)

            await expect(newSignerBookadotConfig.updateTreasury(newTreasurAddress)).to.be.revertedWith('Ownable: caller is not the owner')
        })
    })

    describe('Verify update Bookadot operator address', function () {
        it('should update Bookadot operator address with valid value', async function () {
            let signers = await ethers.getSigners()
            const newSignerAddress = signers[2].address
            const permission = true

            let updateBackendTx = await bookadotConfig.updateBookadotSigner(newSignerAddress)
            await updateBackendTx.wait()

            expect(await bookadotConfig.bookadotSigner()).to.equal(newSignerAddress)
        })

        it('should not update Bookadot signer address with zero address', async function () {
            await expect(bookadotConfig.updateBookadotSigner(zeroAddress)).to.be.revertedWith('Config: signer is zero address')
        })

        it('only owner be able to update Bookadot signer address', async function () {
            let signers = await ethers.getSigners()
            const newSignerAddress = signers[2].address

            let newSignerBookadotConfig = await connectContractToNewSigner(bookadotConfig)

            await expect(newSignerBookadotConfig.updateBookadotSigner(newSignerAddress)).to.be.revertedWith('Ownable: caller is not the owner')
        })
    })
})

async function connectContractToNewSigner(contract: Contract): Promise<Contract> {
    let signers = await ethers.getSigners()
    let newSigner = signers[1]
    let newSignerContract = contract.connect(newSigner)
    return newSignerContract
}