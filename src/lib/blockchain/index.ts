import { DateTime } from "luxon";
import { hash, type SupportedAlgorithm } from "@/lib/crypto";

/**
 * Creates the genesis block for a blockchain. The genesis block is the first block in a blockchain and typically serves
 * as the starting point for the chain.
 *
 * @param {SupportedAlgorithm} algorithm - The cryptographic algorithm to use for hashing.
 * @param {number} difficulty - The difficulty level represented by the number of leading zeroes required in the hash.
 *
 * @return {Promise<Readonly<IBlock>>} A promise that resolves to the immutable genesis block containing standard
 *                                     initial values such as index 0, the current timestamp, a predefined data string,
 *                                     and a default previous hash of "0".
 */
export async function createGenesisBlock(algorithm: SupportedAlgorithm, difficulty: number): Promise<Readonly<IBlock>> {
  const template = {
    index: 0,
    timestamp: Date.now(),
    transaction: "Genesis Block",
    previousHash: "0",
    nonce: 0,
    hash: "",
    duration: 0,
  };

  const start = performance.now();
  const block = await mineBlock(Object.freeze(template), algorithm, difficulty);

  return Object.freeze({ ...block, duration: performance.now() - start });
}

/**
 * Adds a new block to the blockchain by creating, mining, and appending it to the existing chain.
 *
 * @param {Array<Readonly<IBlock>>} chain - The current blockchain to which the new block will be added.
 * @param {string} transaction - The transaction data to include in the new block.
 * @param {SupportedAlgorithm} algorithm - The hashing algorithm to use for mining the new block.
 * @param {number} difficulty - The mining difficulty, which determines the computational complexity.
 * @return {Promise<Array<Readonly<IBlock>>>} A promise that resolves to the updated blockchain with the newly added block.
 */
export async function addBlock(
  chain: Array<Readonly<IBlock>>,
  transaction: string,
  algorithm: SupportedAlgorithm,
  difficulty: number
): Promise<Array<Readonly<IBlock>>> {
  const previousBlock = chain[chain.length - 1];
  const newIndex = previousBlock.index + 1;
  const timestamp = DateTime.utc().toMillis();

  const start = performance.now();

  // Create a new block
  const templateBlock = await createBlock(algorithm, newIndex, timestamp, transaction, previousBlock.hash!);
  const minedBlock = await mineBlock(templateBlock, algorithm, difficulty);

  return [...chain, Object.freeze({ ...minedBlock, duration: performance.now() - start })];
}

/**
 * Creates a new blockchain block with the given parameters, computes its hash, and returns an immutable block object.
 *
 * @param {SupportedAlgorithm} algorithm - The cryptographic algorithm to use for hashing.
 * @param {number} index - The index of the block in the blockchain.
 * @param {number} timestamp - The timestamp when the block is created.
 * @param {string} transaction - The transaction data to be included in the block.
 * @param {string} previousHash - The hash of the previous block in the blockchain.
 * @param {number} [nonce=0] - A nonce value used for proof-of-work computations (default is 0).
 * @return {Promise<Readonly<IBlock>>} A promise that resolves to an immutable block object with the computed hash.
 */
async function createBlock(
  algorithm: SupportedAlgorithm,
  index: number,
  timestamp: number,
  transaction: string,
  previousHash: string,
  nonce: number = 0
): Promise<Readonly<IBlock>> {
  const block: IBlock = {
    index,
    timestamp,
    transaction,
    previousHash,
    nonce,
    duration: 0,
  };

  block.hash = await hash(algorithm, String(index + timestamp + transaction + previousHash + nonce));
  return Object.freeze(block);
}

/**
 * Mines a block by finding a hash that satisfies the given difficulty level.
 *
 * @param {Readonly<IBlock>} block - The block to be mined.
 * @param {SupportedAlgorithm} algorithm - The cryptographic algorithm to use for hashing.
 * @param {number} difficulty - The difficulty level represented by the number of leading zeroes required in the hash.
 * @return {Promise<Readonly<IBlock>>} A promise that resolves to the mined block with a valid hash.
 */
async function mineBlock(block: Readonly<IBlock>, algorithm: SupportedAlgorithm, difficulty: number): Promise<Readonly<IBlock>> {
  const target = "0".repeat(difficulty);

  if (block.hash!.startsWith(target)) {
    return block;
  }

  const newBlock = await createBlock(
    algorithm,
    block.index,
    block.timestamp,
    block.transaction,
    block.previousHash,
    block.nonce + 1
  );
  return await mineBlock(newBlock, algorithm, difficulty);
}

/**
 * Validates a blockchain by checking the integrity and linkage of the blocks.
 *
 * @param {SupportedAlgorithm} algorithm - The cryptographic algorithm to use for hashing.
 * @param {Array<Readonly<IBlock>>} chain - An array of blocks representing the blockchain. Each block is readonly.
 * @return {Promise<boolean>} A promise that resolves to `true` if the chain is valid, otherwise `false`.
 */
export async function validateChain(algorithm: SupportedAlgorithm, chain: Array<Readonly<IBlock>>): Promise<Array<{ blockId: number, ok: boolean }>> {
  const report: Array<{ blockId: number, ok: boolean }> = [];

  // Handle Empty Chain
  if (chain.length === 0) return report;

  // Definition usually considers the Genesis block valid (or validate its hash only)
  // We push it immediately, so the UI has a status for the first card.
  report.push({ blockId: chain[0].index, ok: true });

  let isBroken = false;

  for (let i = 1; i < chain.length; i++) {
    const currentBlock = chain[i];
    const previousBlock = chain[i - 1];

    if (isBroken) {
      report.push({ blockId: currentBlock.index, ok: false });
      continue;
    }

    // Check 1: Validate Hash Integrity
    const computed = await hash(
      algorithm,
      String(
        currentBlock.index +
        currentBlock.timestamp +
        currentBlock.transaction +
        currentBlock.previousHash +
        currentBlock.nonce
      )
    );

    if (currentBlock.hash !== computed) {
      isBroken = true;
      report.push({ blockId: currentBlock.index, ok: false });
      continue;
    }

    // Check 2: Validate Link to Previous Block
    if (currentBlock.previousHash !== previousBlock.hash) {
      isBroken = true;
      report.push({ blockId: currentBlock.index, ok: false });
      continue;
    }

    // Valid
    report.push({ blockId: currentBlock.index, ok: true });
  }

  return report;
}

export interface IBlock {
  /**
   * Position of the block in the blockchain.
   */
  index: number;

  /**
   * Timestamp of the block.
   * @remarks Time is in UTC and formatted as Unix Epoch
   */
  timestamp: number;

  /**
   * The transaction data.
   */
  transaction: string;

  /**
   * Previous block hash.
   */
  previousHash: string;

  /**
   * Hash of the block.
   */
  hash?: string;

  /**
   * Nonce of the block.
   */
  nonce: number;

  /**
   * Calculation time in milliseconds.
   */
  duration: number;
}
