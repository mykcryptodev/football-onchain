import {
  type AbiParameterToPrimitiveType,
  type BaseTransactionOptions,
  prepareContractCall,
  prepareEvent,
  readContract,
} from "thirdweb";

/**
 * Contract events
 */

/**
 * Represents the filters for the "OwnershipTransferRequested" event.
 */
export type OwnershipTransferRequestedEventFilters = Partial<{
  from: AbiParameterToPrimitiveType<{
    indexed: true;
    internalType: "address";
    name: "from";
    type: "address";
  }>;
  to: AbiParameterToPrimitiveType<{
    indexed: true;
    internalType: "address";
    name: "to";
    type: "address";
  }>;
}>;

/**
 * Creates an event object for the OwnershipTransferRequested event.
 * @param filters - Optional filters to apply to the event.
 * @returns The prepared event object.
 * @example
 * ```
 * import { getContractEvents } from "thirdweb";
 * import { ownershipTransferRequestedEvent } from "TODO";
 *
 * const events = await getContractEvents({
 * contract,
 * events: [
 *  ownershipTransferRequestedEvent({
 *  from: ...,
 *  to: ...,
 * })
 * ],
 * });
 * ```
 */
export function ownershipTransferRequestedEvent(
  filters: OwnershipTransferRequestedEventFilters = {},
) {
  return prepareEvent({
    signature:
      "event OwnershipTransferRequested(address indexed from, address indexed to)",
    filters,
  });
}

/**
 * Represents the filters for the "OwnershipTransferred" event.
 */
export type OwnershipTransferredEventFilters = Partial<{
  from: AbiParameterToPrimitiveType<{
    indexed: true;
    internalType: "address";
    name: "from";
    type: "address";
  }>;
  to: AbiParameterToPrimitiveType<{
    indexed: true;
    internalType: "address";
    name: "to";
    type: "address";
  }>;
}>;

/**
 * Creates an event object for the OwnershipTransferred event.
 * @param filters - Optional filters to apply to the event.
 * @returns The prepared event object.
 * @example
 * ```
 * import { getContractEvents } from "thirdweb";
 * import { ownershipTransferredEvent } from "TODO";
 *
 * const events = await getContractEvents({
 * contract,
 * events: [
 *  ownershipTransferredEvent({
 *  from: ...,
 *  to: ...,
 * })
 * ],
 * });
 * ```
 */
export function ownershipTransferredEvent(
  filters: OwnershipTransferredEventFilters = {},
) {
  return prepareEvent({
    signature:
      "event OwnershipTransferred(address indexed from, address indexed to)",
    filters,
  });
}

/**
 * Represents the filters for the "RandomNumberRequested" event.
 */
export type RandomNumberRequestedEventFilters = Partial<{
  contestId: AbiParameterToPrimitiveType<{
    indexed: true;
    internalType: "uint256";
    name: "contestId";
    type: "uint256";
  }>;
  requestId: AbiParameterToPrimitiveType<{
    indexed: true;
    internalType: "uint256";
    name: "requestId";
    type: "uint256";
  }>;
}>;

/**
 * Creates an event object for the RandomNumberRequested event.
 * @param filters - Optional filters to apply to the event.
 * @returns The prepared event object.
 * @example
 * ```
 * import { getContractEvents } from "thirdweb";
 * import { randomNumberRequestedEvent } from "TODO";
 *
 * const events = await getContractEvents({
 * contract,
 * events: [
 *  randomNumberRequestedEvent({
 *  contestId: ...,
 *  requestId: ...,
 * })
 * ],
 * });
 * ```
 */
export function randomNumberRequestedEvent(
  filters: RandomNumberRequestedEventFilters = {},
) {
  return prepareEvent({
    signature:
      "event RandomNumberRequested(uint256 indexed contestId, uint256 indexed requestId, uint256 requestPrice)",
    filters,
  });
}

/**
 * Contract read functions
 */

/**
 * Calls the "CALLBACK_GAS_LIMIT" function on the contract.
 * @param options - The options for the CALLBACK_GAS_LIMIT function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { CALLBACK_GAS_LIMIT } from "TODO";
 *
 * const result = await CALLBACK_GAS_LIMIT();
 *
 * ```
 */
export async function CALLBACK_GAS_LIMIT(options: BaseTransactionOptions) {
  return readContract({
    contract: options.contract,
    method: [
      "0x33d608f1",
      [],
      [
        {
          internalType: "uint32",
          name: "",
          type: "uint32",
        },
      ],
    ],
    params: [],
  });
}

/**
 * Calls the "GAS_ORACLE" function on the contract.
 * @param options - The options for the GAS_ORACLE function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { GAS_ORACLE } from "TODO";
 *
 * const result = await GAS_ORACLE();
 *
 * ```
 */
export async function GAS_ORACLE(options: BaseTransactionOptions) {
  return readContract({
    contract: options.contract,
    method: [
      "0x6942d877",
      [],
      [
        {
          internalType: "contract IGasOracle",
          name: "",
          type: "address",
        },
      ],
    ],
    params: [],
  });
}

/**
 * Calls the "NUM_WORDS" function on the contract.
 * @param options - The options for the NUM_WORDS function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { NUM_WORDS } from "TODO";
 *
 * const result = await NUM_WORDS();
 *
 * ```
 */
export async function NUM_WORDS(options: BaseTransactionOptions) {
  return readContract({
    contract: options.contract,
    method: [
      "0x72cf6e34",
      [],
      [
        {
          internalType: "uint32",
          name: "",
          type: "uint32",
        },
      ],
    ],
    params: [],
  });
}

/**
 * Calls the "REQUEST_CONFIRMATIONS" function on the contract.
 * @param options - The options for the REQUEST_CONFIRMATIONS function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { REQUEST_CONFIRMATIONS } from "TODO";
 *
 * const result = await REQUEST_CONFIRMATIONS();
 *
 * ```
 */
export async function REQUEST_CONFIRMATIONS(options: BaseTransactionOptions) {
  return readContract({
    contract: options.contract,
    method: [
      "0x67f082b0",
      [],
      [
        {
          internalType: "uint16",
          name: "",
          type: "uint16",
        },
      ],
    ],
    params: [],
  });
}

/**
 * Calls the "contests" function on the contract.
 * @param options - The options for the contests function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { contests } from "TODO";
 *
 * const result = await contests();
 *
 * ```
 */
export async function contests(options: BaseTransactionOptions) {
  return readContract({
    contract: options.contract,
    method: [
      "0xe17702e9",
      [],
      [
        {
          internalType: "contract IContests",
          name: "",
          type: "address",
        },
      ],
    ],
    params: [],
  });
}

/**
 * Calls the "estimateRequestPrice" function on the contract.
 * @param options - The options for the estimateRequestPrice function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { estimateRequestPrice } from "TODO";
 *
 * const result = await estimateRequestPrice({
 *  gasPriceWei: ...,
 * });
 *
 * ```
 */
export async function estimateRequestPrice(
  options: BaseTransactionOptions,
): Promise<bigint> {
  return readContract({
    contract: options.contract,
    method: "function estimateRequestPrice() view returns (uint256)",
    params: [],
  });
}

/**
 * Calls the "estimateRequestPriceWithDefaultGas" function on the contract.
 * @param options - The options for the estimateRequestPriceWithDefaultGas function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { estimateRequestPriceWithDefaultGas } from "TODO";
 *
 * const result = await estimateRequestPriceWithDefaultGas();
 *
 * ```
 */
export async function estimateRequestPriceWithDefaultGas(
  options: BaseTransactionOptions,
) {
  return readContract({
    contract: options.contract,
    method: [
      "0x52bb4850",
      [],
      [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
    ],
    params: [],
  });
}

/**
 * Calls the "getBalance" function on the contract.
 * @param options - The options for the getBalance function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { getBalance } from "TODO";
 *
 * const result = await getBalance();
 *
 * ```
 */
export async function getBalance(options: BaseTransactionOptions) {
  return readContract({
    contract: options.contract,
    method: [
      "0x12065fe0",
      [],
      [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
    ],
    params: [],
  });
}

/**
 * Calls the "getCallbackGasLimit" function on the contract.
 * @param options - The options for the getCallbackGasLimit function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { getCallbackGasLimit } from "TODO";
 *
 * const result = await getCallbackGasLimit();
 *
 * ```
 */
export async function getCallbackGasLimit(options: BaseTransactionOptions) {
  return readContract({
    contract: options.contract,
    method: [
      "0xde8be8e7",
      [],
      [
        {
          internalType: "uint32",
          name: "",
          type: "uint32",
        },
      ],
    ],
    params: [],
  });
}

/**
 * Calls the "getCurrentRequestPrice" function on the contract.
 * @param options - The options for the getCurrentRequestPrice function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { getCurrentRequestPrice } from "TODO";
 *
 * const result = await getCurrentRequestPrice();
 *
 * ```
 */
export async function getCurrentRequestPrice(options: BaseTransactionOptions) {
  return readContract({
    contract: options.contract,
    method: [
      "0xdae41cf7",
      [],
      [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
    ],
    params: [],
  });
}

/**
 * Calls the "getLinkToken" function on the contract.
 * @param options - The options for the getLinkToken function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { getLinkToken } from "TODO";
 *
 * const result = await getLinkToken();
 *
 * ```
 */
export async function getLinkToken(options: BaseTransactionOptions) {
  return readContract({
    contract: options.contract,
    method: [
      "0xe76d5168",
      [],
      [
        {
          internalType: "contract LinkTokenInterface",
          name: "",
          type: "address",
        },
      ],
    ],
    params: [],
  });
}

/**
 * Calls the "getVRFWrapperAddress" function on the contract.
 * @param options - The options for the getVRFWrapperAddress function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { getVRFWrapperAddress } from "TODO";
 *
 * const result = await getVRFWrapperAddress();
 *
 * ```
 */
export async function getVRFWrapperAddress(options: BaseTransactionOptions) {
  return readContract({
    contract: options.contract,
    method: [
      "0x84788a92",
      [],
      [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
    ],
    params: [],
  });
}

/**
 * Calls the "i_vrfV2PlusWrapper" function on the contract.
 * @param options - The options for the i_vrfV2PlusWrapper function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { i_vrfV2PlusWrapper } from "TODO";
 *
 * const result = await i_vrfV2PlusWrapper();
 *
 * ```
 */
// eslint-disable-next-line camelcase
export async function i_vrfV2PlusWrapper(options: BaseTransactionOptions) {
  return readContract({
    contract: options.contract,
    method: [
      "0x9ed0868d",
      [],
      [
        {
          internalType: "contract IVRFV2PlusWrapper",
          name: "",
          type: "address",
        },
      ],
    ],
    params: [],
  });
}

/**
 * Calls the "owner" function on the contract.
 * @param options - The options for the owner function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { owner } from "TODO";
 *
 * const result = await owner();
 *
 * ```
 */
export async function owner(options: BaseTransactionOptions) {
  return readContract({
    contract: options.contract,
    method: [
      "0x8da5cb5b",
      [],
      [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
    ],
    params: [],
  });
}

/**
 * Contract write functions
 */

/**
 * Calls the "acceptOwnership" function on the contract.
 * @param options - The options for the "acceptOwnership" function.
 * @returns A prepared transaction object.
 * @example
 * ```
 * import { acceptOwnership } from "TODO";
 *
 * const transaction = acceptOwnership();
 *
 * // Send the transaction
 * ...
 *
 * ```
 */
export function acceptOwnership(options: BaseTransactionOptions) {
  return prepareContractCall({
    contract: options.contract,
    method: ["0x79ba5097", [], []],
    params: [],
  });
}

/**
 * Represents the parameters for the "rawFulfillRandomWords" function.
 */
export type RawFulfillRandomWordsParams = {
  requestId: AbiParameterToPrimitiveType<{
    internalType: "uint256";
    name: "_requestId";
    type: "uint256";
  }>;
  randomWords: AbiParameterToPrimitiveType<{
    internalType: "uint256[]";
    name: "_randomWords";
    type: "uint256[]";
  }>;
};

/**
 * Calls the "rawFulfillRandomWords" function on the contract.
 * @param options - The options for the "rawFulfillRandomWords" function.
 * @returns A prepared transaction object.
 * @example
 * ```
 * import { rawFulfillRandomWords } from "TODO";
 *
 * const transaction = rawFulfillRandomWords({
 *  requestId: ...,
 *  randomWords: ...,
 * });
 *
 * // Send the transaction
 * ...
 *
 * ```
 */
export function rawFulfillRandomWords(
  options: BaseTransactionOptions<RawFulfillRandomWordsParams>,
) {
  return prepareContractCall({
    contract: options.contract,
    method: [
      "0x1fe543e3",
      [
        {
          internalType: "uint256",
          name: "_requestId",
          type: "uint256",
        },
        {
          internalType: "uint256[]",
          name: "_randomWords",
          type: "uint256[]",
        },
      ],
      [],
    ],
    params: [options.requestId, options.randomWords],
  });
}

/**
 * Represents the parameters for the "requestRandomNumbers" function.
 */
export type RequestRandomNumbersParams = {
  contestId: AbiParameterToPrimitiveType<{
    internalType: "uint256";
    name: "contestId";
    type: "uint256";
  }>;
};

/**
 * Calls the "requestRandomNumbers" function on the contract.
 * @param options - The options for the "requestRandomNumbers" function.
 * @returns A prepared transaction object.
 * @example
 * ```
 * import { requestRandomNumbers } from "TODO";
 *
 * const transaction = requestRandomNumbers({
 *  contestId: ...,
 * });
 *
 * // Send the transaction
 * ...
 *
 * ```
 */
export function requestRandomNumbers(
  options: BaseTransactionOptions<RequestRandomNumbersParams>,
) {
  return prepareContractCall({
    contract: options.contract,
    method: [
      "0x7da8959d",
      [
        {
          internalType: "uint256",
          name: "contestId",
          type: "uint256",
        },
      ],
      [],
    ],
    params: [options.contestId],
  });
}

/**
 * Represents the parameters for the "setContests" function.
 */
export type SetContestsParams = {
  contests: AbiParameterToPrimitiveType<{
    internalType: "address";
    name: "_contests";
    type: "address";
  }>;
};

/**
 * Calls the "setContests" function on the contract.
 * @param options - The options for the "setContests" function.
 * @returns A prepared transaction object.
 * @example
 * ```
 * import { setContests } from "TODO";
 *
 * const transaction = setContests({
 *  contests: ...,
 * });
 *
 * // Send the transaction
 * ...
 *
 * ```
 */
export function setContests(
  options: BaseTransactionOptions<SetContestsParams>,
) {
  return prepareContractCall({
    contract: options.contract,
    method: [
      "0xc2ec157d",
      [
        {
          internalType: "address",
          name: "_contests",
          type: "address",
        },
      ],
      [],
    ],
    params: [options.contests],
  });
}

/**
 * Represents the parameters for the "transferOwnership" function.
 */
export type TransferOwnershipParams = {
  to: AbiParameterToPrimitiveType<{
    internalType: "address";
    name: "to";
    type: "address";
  }>;
};

/**
 * Calls the "transferOwnership" function on the contract.
 * @param options - The options for the "transferOwnership" function.
 * @returns A prepared transaction object.
 * @example
 * ```
 * import { transferOwnership } from "TODO";
 *
 * const transaction = transferOwnership({
 *  to: ...,
 * });
 *
 * // Send the transaction
 * ...
 *
 * ```
 */
export function transferOwnership(
  options: BaseTransactionOptions<TransferOwnershipParams>,
) {
  return prepareContractCall({
    contract: options.contract,
    method: [
      "0xf2fde38b",
      [
        {
          internalType: "address",
          name: "to",
          type: "address",
        },
      ],
      [],
    ],
    params: [options.to],
  });
}

/**
 * Calls the "withdraw" function on the contract.
 * @param options - The options for the "withdraw" function.
 * @returns A prepared transaction object.
 * @example
 * ```
 * import { withdraw } from "TODO";
 *
 * const transaction = withdraw();
 *
 * // Send the transaction
 * ...
 *
 * ```
 */
export function withdraw(options: BaseTransactionOptions) {
  return prepareContractCall({
    contract: options.contract,
    method: ["0x3ccfd60b", [], []],
    params: [],
  });
}
