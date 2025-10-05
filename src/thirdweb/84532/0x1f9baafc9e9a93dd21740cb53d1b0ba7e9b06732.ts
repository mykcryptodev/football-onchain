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
 * Represents the filters for the "Approval" event.
 */
export type ApprovalEventFilters = Partial<{
  owner: AbiParameterToPrimitiveType<{
    type: "address";
    name: "owner";
    indexed: true;
    internalType: "address";
  }>;
  approved: AbiParameterToPrimitiveType<{
    type: "address";
    name: "approved";
    indexed: true;
    internalType: "address";
  }>;
  tokenId: AbiParameterToPrimitiveType<{
    type: "uint256";
    name: "tokenId";
    indexed: true;
    internalType: "uint256";
  }>;
}>;

/**
 * Creates an event object for the Approval event.
 * @param filters - Optional filters to apply to the event.
 * @returns The prepared event object.
 * @example
 * ```
 * import { getContractEvents } from "thirdweb";
 * import { approvalEvent } from "TODO";
 *
 * const events = await getContractEvents({
 * contract,
 * events: [
 *  approvalEvent({
 *  owner: ...,
 *  approved: ...,
 *  tokenId: ...,
 * })
 * ],
 * });
 * ```
 */
export function approvalEvent(filters: ApprovalEventFilters = {}) {
  return prepareEvent({
    signature:
      "event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)",
    filters,
  });
}

/**
 * Represents the filters for the "ApprovalForAll" event.
 */
export type ApprovalForAllEventFilters = Partial<{
  owner: AbiParameterToPrimitiveType<{
    type: "address";
    name: "owner";
    indexed: true;
    internalType: "address";
  }>;
  operator: AbiParameterToPrimitiveType<{
    type: "address";
    name: "operator";
    indexed: true;
    internalType: "address";
  }>;
}>;

/**
 * Creates an event object for the ApprovalForAll event.
 * @param filters - Optional filters to apply to the event.
 * @returns The prepared event object.
 * @example
 * ```
 * import { getContractEvents } from "thirdweb";
 * import { approvalForAllEvent } from "TODO";
 *
 * const events = await getContractEvents({
 * contract,
 * events: [
 *  approvalForAllEvent({
 *  owner: ...,
 *  operator: ...,
 * })
 * ],
 * });
 * ```
 */
export function approvalForAllEvent(filters: ApprovalForAllEventFilters = {}) {
  return prepareEvent({
    signature:
      "event ApprovalForAll(address indexed owner, address indexed operator, bool approved)",
    filters,
  });
}

/**
 * Represents the filters for the "Transfer" event.
 */
export type TransferEventFilters = Partial<{
  from: AbiParameterToPrimitiveType<{
    type: "address";
    name: "from";
    indexed: true;
    internalType: "address";
  }>;
  to: AbiParameterToPrimitiveType<{
    type: "address";
    name: "to";
    indexed: true;
    internalType: "address";
  }>;
  tokenId: AbiParameterToPrimitiveType<{
    type: "uint256";
    name: "tokenId";
    indexed: true;
    internalType: "uint256";
  }>;
}>;

/**
 * Creates an event object for the Transfer event.
 * @param filters - Optional filters to apply to the event.
 * @returns The prepared event object.
 * @example
 * ```
 * import { getContractEvents } from "thirdweb";
 * import { transferEvent } from "TODO";
 *
 * const events = await getContractEvents({
 * contract,
 * events: [
 *  transferEvent({
 *  from: ...,
 *  to: ...,
 *  tokenId: ...,
 * })
 * ],
 * });
 * ```
 */
export function transferEvent(filters: TransferEventFilters = {}) {
  return prepareEvent({
    signature:
      "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
    filters,
  });
}

/**
 * Contract read functions
 */

/**
 * Represents the parameters for the "balanceOf" function.
 */
export type BalanceOfParams = {
  owner: AbiParameterToPrimitiveType<{
    type: "address";
    name: "owner";
    internalType: "address";
  }>;
};

/**
 * Calls the "balanceOf" function on the contract.
 * @param options - The options for the balanceOf function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { balanceOf } from "TODO";
 *
 * const result = await balanceOf({
 *  owner: ...,
 * });
 *
 * ```
 */
export async function balanceOf(
  options: BaseTransactionOptions<BalanceOfParams>,
) {
  return readContract({
    contract: options.contract,
    method: [
      "0x70a08231",
      [
        {
          type: "address",
          name: "owner",
          internalType: "address",
        },
      ],
      [
        {
          type: "uint256",
          name: "",
          internalType: "uint256",
        },
      ],
    ],
    params: [options.owner],
  });
}

/**
 * Represents the parameters for the "getApproved" function.
 */
export type GetApprovedParams = {
  tokenId: AbiParameterToPrimitiveType<{
    type: "uint256";
    name: "tokenId";
    internalType: "uint256";
  }>;
};

/**
 * Calls the "getApproved" function on the contract.
 * @param options - The options for the getApproved function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { getApproved } from "TODO";
 *
 * const result = await getApproved({
 *  tokenId: ...,
 * });
 *
 * ```
 */
export async function getApproved(
  options: BaseTransactionOptions<GetApprovedParams>,
) {
  return readContract({
    contract: options.contract,
    method: [
      "0x081812fc",
      [
        {
          type: "uint256",
          name: "tokenId",
          internalType: "uint256",
        },
      ],
      [
        {
          type: "address",
          name: "",
          internalType: "address",
        },
      ],
    ],
    params: [options.tokenId],
  });
}

/**
 * Represents the parameters for the "isApprovedForAll" function.
 */
export type IsApprovedForAllParams = {
  owner: AbiParameterToPrimitiveType<{
    type: "address";
    name: "owner";
    internalType: "address";
  }>;
  operator: AbiParameterToPrimitiveType<{
    type: "address";
    name: "operator";
    internalType: "address";
  }>;
};

/**
 * Calls the "isApprovedForAll" function on the contract.
 * @param options - The options for the isApprovedForAll function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { isApprovedForAll } from "TODO";
 *
 * const result = await isApprovedForAll({
 *  owner: ...,
 *  operator: ...,
 * });
 *
 * ```
 */
export async function isApprovedForAll(
  options: BaseTransactionOptions<IsApprovedForAllParams>,
) {
  return readContract({
    contract: options.contract,
    method: [
      "0xe985e9c5",
      [
        {
          type: "address",
          name: "owner",
          internalType: "address",
        },
        {
          type: "address",
          name: "operator",
          internalType: "address",
        },
      ],
      [
        {
          type: "bool",
          name: "",
          internalType: "bool",
        },
      ],
    ],
    params: [options.owner, options.operator],
  });
}

/**
 * Represents the parameters for the "ownerOf" function.
 */
export type OwnerOfParams = {
  tokenId: AbiParameterToPrimitiveType<{
    type: "uint256";
    name: "tokenId";
    internalType: "uint256";
  }>;
};

/**
 * Calls the "ownerOf" function on the contract.
 * @param options - The options for the ownerOf function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { ownerOf } from "TODO";
 *
 * const result = await ownerOf({
 *  tokenId: ...,
 * });
 *
 * ```
 */
export async function ownerOf(options: BaseTransactionOptions<OwnerOfParams>) {
  return readContract({
    contract: options.contract,
    method: [
      "0x6352211e",
      [
        {
          type: "uint256",
          name: "tokenId",
          internalType: "uint256",
        },
      ],
      [
        {
          type: "address",
          name: "",
          internalType: "address",
        },
      ],
    ],
    params: [options.tokenId],
  });
}

/**
 * Calls the "name" function on the contract.
 * @param options - The options for the name function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { name } from "TODO";
 *
 * const result = await name();
 *
 * ```
 */
export async function name(options: BaseTransactionOptions) {
  return readContract({
    contract: options.contract,
    method: [
      "0x06fdde03",
      [],
      [
        {
          type: "string",
          name: "",
          internalType: "string",
        },
      ],
    ],
    params: [],
  });
}

/**
 * Calls the "symbol" function on the contract.
 * @param options - The options for the symbol function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { symbol } from "TODO";
 *
 * const result = await symbol();
 *
 * ```
 */
export async function symbol(options: BaseTransactionOptions) {
  return readContract({
    contract: options.contract,
    method: [
      "0x95d89b41",
      [],
      [
        {
          type: "string",
          name: "",
          internalType: "string",
        },
      ],
    ],
    params: [],
  });
}

/**
 * Represents the parameters for the "tokenURI" function.
 */
export type TokenURIParams = {
  tokenId: AbiParameterToPrimitiveType<{
    type: "uint256";
    name: "_tokenId";
    internalType: "uint256";
  }>;
};

/**
 * Calls the "tokenURI" function on the contract.
 * @param options - The options for the tokenURI function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { tokenURI } from "TODO";
 *
 * const result = await tokenURI({
 *  tokenId: ...,
 * });
 *
 * ```
 */
export async function tokenURI(
  options: BaseTransactionOptions<TokenURIParams>,
) {
  return readContract({
    contract: options.contract,
    method: [
      "0xc87b56dd",
      [
        {
          type: "uint256",
          name: "_tokenId",
          internalType: "uint256",
        },
      ],
      [
        {
          type: "string",
          name: "",
          internalType: "string",
        },
      ],
    ],
    params: [options.tokenId],
  });
}

/**
 * Calls the "totalSupply" function on the contract.
 * @param options - The options for the totalSupply function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { totalSupply } from "TODO";
 *
 * const result = await totalSupply();
 *
 * ```
 */
export async function totalSupply(options: BaseTransactionOptions) {
  return readContract({
    contract: options.contract,
    method: [
      "0x18160ddd",
      [],
      [
        {
          type: "uint256",
          name: "",
          internalType: "uint256",
        },
      ],
    ],
    params: [],
  });
}

/**
 * Represents the parameters for the "tokenByIndex" function.
 */
export type TokenByIndexParams = {
  index: AbiParameterToPrimitiveType<{
    type: "uint256";
    name: "_index";
    internalType: "uint256";
  }>;
};

/**
 * Calls the "tokenByIndex" function on the contract.
 * @param options - The options for the tokenByIndex function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { tokenByIndex } from "TODO";
 *
 * const result = await tokenByIndex({
 *  index: ...,
 * });
 *
 * ```
 */
export async function tokenByIndex(
  options: BaseTransactionOptions<TokenByIndexParams>,
) {
  return readContract({
    contract: options.contract,
    method: [
      "0x4f6ccce7",
      [
        {
          type: "uint256",
          name: "_index",
          internalType: "uint256",
        },
      ],
      [
        {
          type: "uint256",
          name: "",
          internalType: "uint256",
        },
      ],
    ],
    params: [options.index],
  });
}

/**
 * Represents the parameters for the "tokenOfOwnerByIndex" function.
 */
export type TokenOfOwnerByIndexParams = {
  owner: AbiParameterToPrimitiveType<{
    type: "address";
    name: "_owner";
    internalType: "address";
  }>;
  index: AbiParameterToPrimitiveType<{
    type: "uint256";
    name: "_index";
    internalType: "uint256";
  }>;
};

/**
 * Calls the "tokenOfOwnerByIndex" function on the contract.
 * @param options - The options for the tokenOfOwnerByIndex function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { tokenOfOwnerByIndex } from "TODO";
 *
 * const result = await tokenOfOwnerByIndex({
 *  owner: ...,
 *  index: ...,
 * });
 *
 * ```
 */
export async function tokenOfOwnerByIndex(
  options: BaseTransactionOptions<TokenOfOwnerByIndexParams>,
) {
  return readContract({
    contract: options.contract,
    method: [
      "0x2f745c59",
      [
        {
          type: "address",
          name: "_owner",
          internalType: "address",
        },
        {
          type: "uint256",
          name: "_index",
          internalType: "uint256",
        },
      ],
      [
        {
          type: "uint256",
          name: "",
          internalType: "uint256",
        },
      ],
    ],
    params: [options.owner, options.index],
  });
}

/**
 * Contract write functions
 */

/**
 * Represents the parameters for the "approve" function.
 */
export type ApproveParams = {
  to: AbiParameterToPrimitiveType<{
    type: "address";
    name: "to";
    internalType: "address";
  }>;
  tokenId: AbiParameterToPrimitiveType<{
    type: "uint256";
    name: "tokenId";
    internalType: "uint256";
  }>;
};

/**
 * Calls the "approve" function on the contract.
 * @param options - The options for the "approve" function.
 * @returns A prepared transaction object.
 * @example
 * ```
 * import { approve } from "TODO";
 *
 * const transaction = approve({
 *  to: ...,
 *  tokenId: ...,
 * });
 *
 * // Send the transaction
 * ...
 *
 * ```
 */
export function approve(options: BaseTransactionOptions<ApproveParams>) {
  return prepareContractCall({
    contract: options.contract,
    method: [
      "0x095ea7b3",
      [
        {
          type: "address",
          name: "to",
          internalType: "address",
        },
        {
          type: "uint256",
          name: "tokenId",
          internalType: "uint256",
        },
      ],
      [],
    ],
    params: [options.to, options.tokenId],
  });
}

/**
 * Represents the parameters for the "safeTransferFrom" function.
 */
export type SafeTransferFromParams = {
  from: AbiParameterToPrimitiveType<{
    type: "address";
    name: "from";
    internalType: "address";
  }>;
  to: AbiParameterToPrimitiveType<{
    type: "address";
    name: "to";
    internalType: "address";
  }>;
  tokenId: AbiParameterToPrimitiveType<{
    type: "uint256";
    name: "tokenId";
    internalType: "uint256";
  }>;
};

/**
 * Calls the "safeTransferFrom" function on the contract.
 * @param options - The options for the "safeTransferFrom" function.
 * @returns A prepared transaction object.
 * @example
 * ```
 * import { safeTransferFrom } from "TODO";
 *
 * const transaction = safeTransferFrom({
 *  from: ...,
 *  to: ...,
 *  tokenId: ...,
 * });
 *
 * // Send the transaction
 * ...
 *
 * ```
 */
export function safeTransferFrom(
  options: BaseTransactionOptions<SafeTransferFromParams>,
) {
  return prepareContractCall({
    contract: options.contract,
    method: [
      "0x42842e0e",
      [
        {
          type: "address",
          name: "from",
          internalType: "address",
        },
        {
          type: "address",
          name: "to",
          internalType: "address",
        },
        {
          type: "uint256",
          name: "tokenId",
          internalType: "uint256",
        },
      ],
      [],
    ],
    params: [options.from, options.to, options.tokenId],
  });
}

/**
 * Represents the parameters for the "setApprovalForAll" function.
 */
export type SetApprovalForAllParams = {
  operator: AbiParameterToPrimitiveType<{
    type: "address";
    name: "operator";
    internalType: "address";
  }>;
  approved: AbiParameterToPrimitiveType<{
    type: "bool";
    name: "_approved";
    internalType: "bool";
  }>;
};

/**
 * Calls the "setApprovalForAll" function on the contract.
 * @param options - The options for the "setApprovalForAll" function.
 * @returns A prepared transaction object.
 * @example
 * ```
 * import { setApprovalForAll } from "TODO";
 *
 * const transaction = setApprovalForAll({
 *  operator: ...,
 *  approved: ...,
 * });
 *
 * // Send the transaction
 * ...
 *
 * ```
 */
export function setApprovalForAll(
  options: BaseTransactionOptions<SetApprovalForAllParams>,
) {
  return prepareContractCall({
    contract: options.contract,
    method: [
      "0xa22cb465",
      [
        {
          type: "address",
          name: "operator",
          internalType: "address",
        },
        {
          type: "bool",
          name: "_approved",
          internalType: "bool",
        },
      ],
      [],
    ],
    params: [options.operator, options.approved],
  });
}

/**
 * Represents the parameters for the "transferFrom" function.
 */
export type TransferFromParams = {
  from: AbiParameterToPrimitiveType<{
    type: "address";
    name: "from";
    internalType: "address";
  }>;
  to: AbiParameterToPrimitiveType<{
    type: "address";
    name: "to";
    internalType: "address";
  }>;
  tokenId: AbiParameterToPrimitiveType<{
    type: "uint256";
    name: "tokenId";
    internalType: "uint256";
  }>;
};

/**
 * Calls the "transferFrom" function on the contract.
 * @param options - The options for the "transferFrom" function.
 * @returns A prepared transaction object.
 * @example
 * ```
 * import { transferFrom } from "TODO";
 *
 * const transaction = transferFrom({
 *  from: ...,
 *  to: ...,
 *  tokenId: ...,
 * });
 *
 * // Send the transaction
 * ...
 *
 * ```
 */
export function transferFrom(
  options: BaseTransactionOptions<TransferFromParams>,
) {
  return prepareContractCall({
    contract: options.contract,
    method: [
      "0x23b872dd",
      [
        {
          type: "address",
          name: "from",
          internalType: "address",
        },
        {
          type: "address",
          name: "to",
          internalType: "address",
        },
        {
          type: "uint256",
          name: "tokenId",
          internalType: "uint256",
        },
      ],
      [],
    ],
    params: [options.from, options.to, options.tokenId],
  });
}
