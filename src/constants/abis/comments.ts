import {
  prepareEvent,
  prepareContractCall,
  readContract,
  type BaseTransactionOptions,
  type AbiParameterToPrimitiveType,
} from "thirdweb";

/**
* Contract events
*/

/**
 * Represents the filters for the "ApprovalAdded" event.
 */
export type ApprovalAddedEventFilters = Partial<{
  author: AbiParameterToPrimitiveType<{"indexed":true,"internalType":"address","name":"author","type":"address"}>
app: AbiParameterToPrimitiveType<{"indexed":true,"internalType":"address","name":"app","type":"address"}>
}>;

/**
 * Creates an event object for the ApprovalAdded event.
 * @param filters - Optional filters to apply to the event.
 * @returns The prepared event object.
 * @example
 * ```
 * import { getContractEvents } from "thirdweb";
 * import { approvalAddedEvent } from "TODO";
 *
 * const events = await getContractEvents({
 * contract,
 * events: [
 *  approvalAddedEvent({
 *  author: ...,
 *  app: ...,
 * })
 * ],
 * });
 * ```
 */
export function approvalAddedEvent(filters: ApprovalAddedEventFilters = {}) {
  return prepareEvent({
    signature: "event ApprovalAdded(address indexed author, address indexed app, uint256 expiry)",
    filters,
  });
};
  

/**
 * Represents the filters for the "ApprovalRemoved" event.
 */
export type ApprovalRemovedEventFilters = Partial<{
  author: AbiParameterToPrimitiveType<{"indexed":true,"internalType":"address","name":"author","type":"address"}>
app: AbiParameterToPrimitiveType<{"indexed":true,"internalType":"address","name":"app","type":"address"}>
}>;

/**
 * Creates an event object for the ApprovalRemoved event.
 * @param filters - Optional filters to apply to the event.
 * @returns The prepared event object.
 * @example
 * ```
 * import { getContractEvents } from "thirdweb";
 * import { approvalRemovedEvent } from "TODO";
 *
 * const events = await getContractEvents({
 * contract,
 * events: [
 *  approvalRemovedEvent({
 *  author: ...,
 *  app: ...,
 * })
 * ],
 * });
 * ```
 */
export function approvalRemovedEvent(filters: ApprovalRemovedEventFilters = {}) {
  return prepareEvent({
    signature: "event ApprovalRemoved(address indexed author, address indexed app)",
    filters,
  });
};
  

/**
 * Represents the filters for the "BatchOperationExecuted" event.
 */
export type BatchOperationExecutedEventFilters = Partial<{
  sender: AbiParameterToPrimitiveType<{"indexed":true,"internalType":"address","name":"sender","type":"address"}>
}>;

/**
 * Creates an event object for the BatchOperationExecuted event.
 * @param filters - Optional filters to apply to the event.
 * @returns The prepared event object.
 * @example
 * ```
 * import { getContractEvents } from "thirdweb";
 * import { batchOperationExecutedEvent } from "TODO";
 *
 * const events = await getContractEvents({
 * contract,
 * events: [
 *  batchOperationExecutedEvent({
 *  sender: ...,
 * })
 * ],
 * });
 * ```
 */
export function batchOperationExecutedEvent(filters: BatchOperationExecutedEventFilters = {}) {
  return prepareEvent({
    signature: "event BatchOperationExecuted(address indexed sender, uint256 operationsCount, uint256 totalValue)",
    filters,
  });
};
  

/**
 * Represents the filters for the "CommentAdded" event.
 */
export type CommentAddedEventFilters = Partial<{
  commentId: AbiParameterToPrimitiveType<{"indexed":true,"internalType":"bytes32","name":"commentId","type":"bytes32"}>
author: AbiParameterToPrimitiveType<{"indexed":true,"internalType":"address","name":"author","type":"address"}>
app: AbiParameterToPrimitiveType<{"indexed":true,"internalType":"address","name":"app","type":"address"}>
}>;

/**
 * Creates an event object for the CommentAdded event.
 * @param filters - Optional filters to apply to the event.
 * @returns The prepared event object.
 * @example
 * ```
 * import { getContractEvents } from "thirdweb";
 * import { commentAddedEvent } from "TODO";
 *
 * const events = await getContractEvents({
 * contract,
 * events: [
 *  commentAddedEvent({
 *  commentId: ...,
 *  author: ...,
 *  app: ...,
 * })
 * ],
 * });
 * ```
 */
export function commentAddedEvent(filters: CommentAddedEventFilters = {}) {
  return prepareEvent({
    signature: "event CommentAdded(bytes32 indexed commentId, address indexed author, address indexed app, uint256 channelId, bytes32 parentId, uint96 createdAt, string content, string targetUri, uint8 commentType, uint8 authMethod, (bytes32 key, bytes value)[] metadata)",
    filters,
  });
};
  

/**
 * Represents the filters for the "CommentDeleted" event.
 */
export type CommentDeletedEventFilters = Partial<{
  commentId: AbiParameterToPrimitiveType<{"indexed":true,"internalType":"bytes32","name":"commentId","type":"bytes32"}>
author: AbiParameterToPrimitiveType<{"indexed":true,"internalType":"address","name":"author","type":"address"}>
}>;

/**
 * Creates an event object for the CommentDeleted event.
 * @param filters - Optional filters to apply to the event.
 * @returns The prepared event object.
 * @example
 * ```
 * import { getContractEvents } from "thirdweb";
 * import { commentDeletedEvent } from "TODO";
 *
 * const events = await getContractEvents({
 * contract,
 * events: [
 *  commentDeletedEvent({
 *  commentId: ...,
 *  author: ...,
 * })
 * ],
 * });
 * ```
 */
export function commentDeletedEvent(filters: CommentDeletedEventFilters = {}) {
  return prepareEvent({
    signature: "event CommentDeleted(bytes32 indexed commentId, address indexed author)",
    filters,
  });
};
  

/**
 * Represents the filters for the "CommentEdited" event.
 */
export type CommentEditedEventFilters = Partial<{
  commentId: AbiParameterToPrimitiveType<{"indexed":true,"internalType":"bytes32","name":"commentId","type":"bytes32"}>
author: AbiParameterToPrimitiveType<{"indexed":true,"internalType":"address","name":"author","type":"address"}>
editedByApp: AbiParameterToPrimitiveType<{"indexed":true,"internalType":"address","name":"editedByApp","type":"address"}>
}>;

/**
 * Creates an event object for the CommentEdited event.
 * @param filters - Optional filters to apply to the event.
 * @returns The prepared event object.
 * @example
 * ```
 * import { getContractEvents } from "thirdweb";
 * import { commentEditedEvent } from "TODO";
 *
 * const events = await getContractEvents({
 * contract,
 * events: [
 *  commentEditedEvent({
 *  commentId: ...,
 *  author: ...,
 *  editedByApp: ...,
 * })
 * ],
 * });
 * ```
 */
export function commentEditedEvent(filters: CommentEditedEventFilters = {}) {
  return prepareEvent({
    signature: "event CommentEdited(bytes32 indexed commentId, address indexed author, address indexed editedByApp, uint256 channelId, bytes32 parentId, uint96 createdAt, uint96 updatedAt, string content, string targetUri, uint8 commentType, uint8 authMethod, (bytes32 key, bytes value)[] metadata)",
    filters,
  });
};
  

/**
 * Represents the filters for the "CommentHookDataUpdate" event.
 */
export type CommentHookDataUpdateEventFilters = Partial<{
  commentId: AbiParameterToPrimitiveType<{"indexed":true,"internalType":"bytes32","name":"commentId","type":"bytes32"}>
}>;

/**
 * Creates an event object for the CommentHookDataUpdate event.
 * @param filters - Optional filters to apply to the event.
 * @returns The prepared event object.
 * @example
 * ```
 * import { getContractEvents } from "thirdweb";
 * import { commentHookDataUpdateEvent } from "TODO";
 *
 * const events = await getContractEvents({
 * contract,
 * events: [
 *  commentHookDataUpdateEvent({
 *  commentId: ...,
 * })
 * ],
 * });
 * ```
 */
export function commentHookDataUpdateEvent(filters: CommentHookDataUpdateEventFilters = {}) {
  return prepareEvent({
    signature: "event CommentHookDataUpdate(bytes32 indexed commentId, (uint8 operation, bytes32 key, bytes value)[] operations)",
    filters,
  });
};
  

/**
 * Represents the filters for the "CommentHookMetadataSet" event.
 */
export type CommentHookMetadataSetEventFilters = Partial<{
  commentId: AbiParameterToPrimitiveType<{"indexed":true,"internalType":"bytes32","name":"commentId","type":"bytes32"}>
key: AbiParameterToPrimitiveType<{"indexed":true,"internalType":"bytes32","name":"key","type":"bytes32"}>
}>;

/**
 * Creates an event object for the CommentHookMetadataSet event.
 * @param filters - Optional filters to apply to the event.
 * @returns The prepared event object.
 * @example
 * ```
 * import { getContractEvents } from "thirdweb";
 * import { commentHookMetadataSetEvent } from "TODO";
 *
 * const events = await getContractEvents({
 * contract,
 * events: [
 *  commentHookMetadataSetEvent({
 *  commentId: ...,
 *  key: ...,
 * })
 * ],
 * });
 * ```
 */
export function commentHookMetadataSetEvent(filters: CommentHookMetadataSetEventFilters = {}) {
  return prepareEvent({
    signature: "event CommentHookMetadataSet(bytes32 indexed commentId, bytes32 indexed key, bytes value)",
    filters,
  });
};
  

/**
 * Represents the filters for the "CommentMetadataSet" event.
 */
export type CommentMetadataSetEventFilters = Partial<{
  commentId: AbiParameterToPrimitiveType<{"indexed":true,"internalType":"bytes32","name":"commentId","type":"bytes32"}>
key: AbiParameterToPrimitiveType<{"indexed":true,"internalType":"bytes32","name":"key","type":"bytes32"}>
}>;

/**
 * Creates an event object for the CommentMetadataSet event.
 * @param filters - Optional filters to apply to the event.
 * @returns The prepared event object.
 * @example
 * ```
 * import { getContractEvents } from "thirdweb";
 * import { commentMetadataSetEvent } from "TODO";
 *
 * const events = await getContractEvents({
 * contract,
 * events: [
 *  commentMetadataSetEvent({
 *  commentId: ...,
 *  key: ...,
 * })
 * ],
 * });
 * ```
 */
export function commentMetadataSetEvent(filters: CommentMetadataSetEventFilters = {}) {
  return prepareEvent({
    signature: "event CommentMetadataSet(bytes32 indexed commentId, bytes32 indexed key, bytes value)",
    filters,
  });
};
  

/**
 * Represents the filters for the "OwnershipHandoverCanceled" event.
 */
export type OwnershipHandoverCanceledEventFilters = Partial<{
  pendingOwner: AbiParameterToPrimitiveType<{"indexed":true,"internalType":"address","name":"pendingOwner","type":"address"}>
}>;

/**
 * Creates an event object for the OwnershipHandoverCanceled event.
 * @param filters - Optional filters to apply to the event.
 * @returns The prepared event object.
 * @example
 * ```
 * import { getContractEvents } from "thirdweb";
 * import { ownershipHandoverCanceledEvent } from "TODO";
 *
 * const events = await getContractEvents({
 * contract,
 * events: [
 *  ownershipHandoverCanceledEvent({
 *  pendingOwner: ...,
 * })
 * ],
 * });
 * ```
 */
export function ownershipHandoverCanceledEvent(filters: OwnershipHandoverCanceledEventFilters = {}) {
  return prepareEvent({
    signature: "event OwnershipHandoverCanceled(address indexed pendingOwner)",
    filters,
  });
};
  

/**
 * Represents the filters for the "OwnershipHandoverRequested" event.
 */
export type OwnershipHandoverRequestedEventFilters = Partial<{
  pendingOwner: AbiParameterToPrimitiveType<{"indexed":true,"internalType":"address","name":"pendingOwner","type":"address"}>
}>;

/**
 * Creates an event object for the OwnershipHandoverRequested event.
 * @param filters - Optional filters to apply to the event.
 * @returns The prepared event object.
 * @example
 * ```
 * import { getContractEvents } from "thirdweb";
 * import { ownershipHandoverRequestedEvent } from "TODO";
 *
 * const events = await getContractEvents({
 * contract,
 * events: [
 *  ownershipHandoverRequestedEvent({
 *  pendingOwner: ...,
 * })
 * ],
 * });
 * ```
 */
export function ownershipHandoverRequestedEvent(filters: OwnershipHandoverRequestedEventFilters = {}) {
  return prepareEvent({
    signature: "event OwnershipHandoverRequested(address indexed pendingOwner)",
    filters,
  });
};
  

/**
 * Represents the filters for the "OwnershipTransferred" event.
 */
export type OwnershipTransferredEventFilters = Partial<{
  oldOwner: AbiParameterToPrimitiveType<{"indexed":true,"internalType":"address","name":"oldOwner","type":"address"}>
newOwner: AbiParameterToPrimitiveType<{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}>
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
 *  oldOwner: ...,
 *  newOwner: ...,
 * })
 * ],
 * });
 * ```
 */
export function ownershipTransferredEvent(filters: OwnershipTransferredEventFilters = {}) {
  return prepareEvent({
    signature: "event OwnershipTransferred(address indexed oldOwner, address indexed newOwner)",
    filters,
  });
};
  

/**
* Contract read functions
*/



/**
 * Calls the "DOMAIN_SEPARATOR" function on the contract.
 * @param options - The options for the DOMAIN_SEPARATOR function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { DOMAIN_SEPARATOR } from "TODO";
 *
 * const result = await DOMAIN_SEPARATOR();
 *
 * ```
 */
export async function DOMAIN_SEPARATOR(
  options: BaseTransactionOptions
) {
  return readContract({
    contract: options.contract,
    method: [
  "0x3644e515",
  [],
  [
    {
      "internalType": "bytes32",
      "name": "",
      "type": "bytes32"
    }
  ]
],
    params: []
  });
};




/**
 * Calls the "channelManager" function on the contract.
 * @param options - The options for the channelManager function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { channelManager } from "TODO";
 *
 * const result = await channelManager();
 *
 * ```
 */
export async function channelManager(
  options: BaseTransactionOptions
) {
  return readContract({
    contract: options.contract,
    method: [
  "0xd1d451ca",
  [],
  [
    {
      "internalType": "contract IChannelManager",
      "name": "",
      "type": "address"
    }
  ]
],
    params: []
  });
};


/**
 * Represents the parameters for the "commentHookMetadata" function.
 */
export type CommentHookMetadataParams = {
  arg_0: AbiParameterToPrimitiveType<{"internalType":"bytes32","name":"","type":"bytes32"}>
arg_1: AbiParameterToPrimitiveType<{"internalType":"bytes32","name":"","type":"bytes32"}>
};

/**
 * Calls the "commentHookMetadata" function on the contract.
 * @param options - The options for the commentHookMetadata function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { commentHookMetadata } from "TODO";
 *
 * const result = await commentHookMetadata({
 *  arg_0: ...,
 *  arg_1: ...,
 * });
 *
 * ```
 */
export async function commentHookMetadata(
  options: BaseTransactionOptions<CommentHookMetadataParams>
) {
  return readContract({
    contract: options.contract,
    method: [
  "0x86066c9d",
  [
    {
      "internalType": "bytes32",
      "name": "",
      "type": "bytes32"
    },
    {
      "internalType": "bytes32",
      "name": "",
      "type": "bytes32"
    }
  ],
  [
    {
      "internalType": "bytes",
      "name": "",
      "type": "bytes"
    }
  ]
],
    params: [options.arg_0, options.arg_1]
  });
};


/**
 * Represents the parameters for the "commentHookMetadataKeys" function.
 */
export type CommentHookMetadataKeysParams = {
  arg_0: AbiParameterToPrimitiveType<{"internalType":"bytes32","name":"","type":"bytes32"}>
arg_1: AbiParameterToPrimitiveType<{"internalType":"uint256","name":"","type":"uint256"}>
};

/**
 * Calls the "commentHookMetadataKeys" function on the contract.
 * @param options - The options for the commentHookMetadataKeys function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { commentHookMetadataKeys } from "TODO";
 *
 * const result = await commentHookMetadataKeys({
 *  arg_0: ...,
 *  arg_1: ...,
 * });
 *
 * ```
 */
export async function commentHookMetadataKeys(
  options: BaseTransactionOptions<CommentHookMetadataKeysParams>
) {
  return readContract({
    contract: options.contract,
    method: [
  "0x144e6614",
  [
    {
      "internalType": "bytes32",
      "name": "",
      "type": "bytes32"
    },
    {
      "internalType": "uint256",
      "name": "",
      "type": "uint256"
    }
  ],
  [
    {
      "internalType": "bytes32",
      "name": "",
      "type": "bytes32"
    }
  ]
],
    params: [options.arg_0, options.arg_1]
  });
};


/**
 * Represents the parameters for the "commentMetadata" function.
 */
export type CommentMetadataParams = {
  arg_0: AbiParameterToPrimitiveType<{"internalType":"bytes32","name":"","type":"bytes32"}>
arg_1: AbiParameterToPrimitiveType<{"internalType":"bytes32","name":"","type":"bytes32"}>
};

/**
 * Calls the "commentMetadata" function on the contract.
 * @param options - The options for the commentMetadata function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { commentMetadata } from "TODO";
 *
 * const result = await commentMetadata({
 *  arg_0: ...,
 *  arg_1: ...,
 * });
 *
 * ```
 */
export async function commentMetadata(
  options: BaseTransactionOptions<CommentMetadataParams>
) {
  return readContract({
    contract: options.contract,
    method: [
  "0xa712eca4",
  [
    {
      "internalType": "bytes32",
      "name": "",
      "type": "bytes32"
    },
    {
      "internalType": "bytes32",
      "name": "",
      "type": "bytes32"
    }
  ],
  [
    {
      "internalType": "bytes",
      "name": "",
      "type": "bytes"
    }
  ]
],
    params: [options.arg_0, options.arg_1]
  });
};


/**
 * Represents the parameters for the "commentMetadataKeys" function.
 */
export type CommentMetadataKeysParams = {
  arg_0: AbiParameterToPrimitiveType<{"internalType":"bytes32","name":"","type":"bytes32"}>
arg_1: AbiParameterToPrimitiveType<{"internalType":"uint256","name":"","type":"uint256"}>
};

/**
 * Calls the "commentMetadataKeys" function on the contract.
 * @param options - The options for the commentMetadataKeys function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { commentMetadataKeys } from "TODO";
 *
 * const result = await commentMetadataKeys({
 *  arg_0: ...,
 *  arg_1: ...,
 * });
 *
 * ```
 */
export async function commentMetadataKeys(
  options: BaseTransactionOptions<CommentMetadataKeysParams>
) {
  return readContract({
    contract: options.contract,
    method: [
  "0x23aa932c",
  [
    {
      "internalType": "bytes32",
      "name": "",
      "type": "bytes32"
    },
    {
      "internalType": "uint256",
      "name": "",
      "type": "uint256"
    }
  ],
  [
    {
      "internalType": "bytes32",
      "name": "",
      "type": "bytes32"
    }
  ]
],
    params: [options.arg_0, options.arg_1]
  });
};


/**
 * Represents the parameters for the "getAddApprovalHash" function.
 */
export type GetAddApprovalHashParams = {
  author: AbiParameterToPrimitiveType<{"internalType":"address","name":"author","type":"address"}>
app: AbiParameterToPrimitiveType<{"internalType":"address","name":"app","type":"address"}>
expiry: AbiParameterToPrimitiveType<{"internalType":"uint256","name":"expiry","type":"uint256"}>
nonce: AbiParameterToPrimitiveType<{"internalType":"uint256","name":"nonce","type":"uint256"}>
deadline: AbiParameterToPrimitiveType<{"internalType":"uint256","name":"deadline","type":"uint256"}>
};

/**
 * Calls the "getAddApprovalHash" function on the contract.
 * @param options - The options for the getAddApprovalHash function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { getAddApprovalHash } from "TODO";
 *
 * const result = await getAddApprovalHash({
 *  author: ...,
 *  app: ...,
 *  expiry: ...,
 *  nonce: ...,
 *  deadline: ...,
 * });
 *
 * ```
 */
export async function getAddApprovalHash(
  options: BaseTransactionOptions<GetAddApprovalHashParams>
) {
  return readContract({
    contract: options.contract,
    method: [
  "0x69b5cd04",
  [
    {
      "internalType": "address",
      "name": "author",
      "type": "address"
    },
    {
      "internalType": "address",
      "name": "app",
      "type": "address"
    },
    {
      "internalType": "uint256",
      "name": "expiry",
      "type": "uint256"
    },
    {
      "internalType": "uint256",
      "name": "nonce",
      "type": "uint256"
    },
    {
      "internalType": "uint256",
      "name": "deadline",
      "type": "uint256"
    }
  ],
  [
    {
      "internalType": "bytes32",
      "name": "",
      "type": "bytes32"
    }
  ]
],
    params: [options.author, options.app, options.expiry, options.nonce, options.deadline]
  });
};


/**
 * Represents the parameters for the "getApprovalExpiry" function.
 */
export type GetApprovalExpiryParams = {
  author: AbiParameterToPrimitiveType<{"internalType":"address","name":"author","type":"address"}>
app: AbiParameterToPrimitiveType<{"internalType":"address","name":"app","type":"address"}>
};

/**
 * Calls the "getApprovalExpiry" function on the contract.
 * @param options - The options for the getApprovalExpiry function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { getApprovalExpiry } from "TODO";
 *
 * const result = await getApprovalExpiry({
 *  author: ...,
 *  app: ...,
 * });
 *
 * ```
 */
export async function getApprovalExpiry(
  options: BaseTransactionOptions<GetApprovalExpiryParams>
) {
  return readContract({
    contract: options.contract,
    method: [
  "0x8e3d471c",
  [
    {
      "internalType": "address",
      "name": "author",
      "type": "address"
    },
    {
      "internalType": "address",
      "name": "app",
      "type": "address"
    }
  ],
  [
    {
      "internalType": "uint256",
      "name": "",
      "type": "uint256"
    }
  ]
],
    params: [options.author, options.app]
  });
};


/**
 * Represents the parameters for the "getComment" function.
 */
export type GetCommentParams = {
  commentId: AbiParameterToPrimitiveType<{"internalType":"bytes32","name":"commentId","type":"bytes32"}>
};

/**
 * Calls the "getComment" function on the contract.
 * @param options - The options for the getComment function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { getComment } from "TODO";
 *
 * const result = await getComment({
 *  commentId: ...,
 * });
 *
 * ```
 */
export async function getComment(
  options: BaseTransactionOptions<GetCommentParams>
) {
  return readContract({
    contract: options.contract,
    method: [
  "0x8c20d587",
  [
    {
      "internalType": "bytes32",
      "name": "commentId",
      "type": "bytes32"
    }
  ],
  [
    {
      "components": [
        {
          "internalType": "address",
          "name": "author",
          "type": "address"
        },
        {
          "internalType": "uint88",
          "name": "createdAt",
          "type": "uint88"
        },
        {
          "internalType": "enum Comments.AuthorAuthMethod",
          "name": "authMethod",
          "type": "uint8"
        },
        {
          "internalType": "address",
          "name": "app",
          "type": "address"
        },
        {
          "internalType": "uint88",
          "name": "updatedAt",
          "type": "uint88"
        },
        {
          "internalType": "uint8",
          "name": "commentType",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "channelId",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "parentId",
          "type": "bytes32"
        },
        {
          "internalType": "string",
          "name": "content",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "targetUri",
          "type": "string"
        }
      ],
      "internalType": "struct Comments.Comment",
      "name": "",
      "type": "tuple"
    }
  ]
],
    params: [options.commentId]
  });
};


/**
 * Represents the parameters for the "getCommentHookMetadata" function.
 */
export type GetCommentHookMetadataParams = {
  commentId: AbiParameterToPrimitiveType<{"internalType":"bytes32","name":"commentId","type":"bytes32"}>
};

/**
 * Calls the "getCommentHookMetadata" function on the contract.
 * @param options - The options for the getCommentHookMetadata function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { getCommentHookMetadata } from "TODO";
 *
 * const result = await getCommentHookMetadata({
 *  commentId: ...,
 * });
 *
 * ```
 */
export async function getCommentHookMetadata(
  options: BaseTransactionOptions<GetCommentHookMetadataParams>
) {
  return readContract({
    contract: options.contract,
    method: [
  "0x3fab8ecd",
  [
    {
      "internalType": "bytes32",
      "name": "commentId",
      "type": "bytes32"
    }
  ],
  [
    {
      "components": [
        {
          "internalType": "bytes32",
          "name": "key",
          "type": "bytes32"
        },
        {
          "internalType": "bytes",
          "name": "value",
          "type": "bytes"
        }
      ],
      "internalType": "struct Metadata.MetadataEntry[]",
      "name": "",
      "type": "tuple[]"
    }
  ]
],
    params: [options.commentId]
  });
};


/**
 * Represents the parameters for the "getCommentHookMetadataKeys" function.
 */
export type GetCommentHookMetadataKeysParams = {
  commentId: AbiParameterToPrimitiveType<{"internalType":"bytes32","name":"commentId","type":"bytes32"}>
};

/**
 * Calls the "getCommentHookMetadataKeys" function on the contract.
 * @param options - The options for the getCommentHookMetadataKeys function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { getCommentHookMetadataKeys } from "TODO";
 *
 * const result = await getCommentHookMetadataKeys({
 *  commentId: ...,
 * });
 *
 * ```
 */
export async function getCommentHookMetadataKeys(
  options: BaseTransactionOptions<GetCommentHookMetadataKeysParams>
) {
  return readContract({
    contract: options.contract,
    method: [
  "0xd605f6bb",
  [
    {
      "internalType": "bytes32",
      "name": "commentId",
      "type": "bytes32"
    }
  ],
  [
    {
      "internalType": "bytes32[]",
      "name": "",
      "type": "bytes32[]"
    }
  ]
],
    params: [options.commentId]
  });
};


/**
 * Represents the parameters for the "getCommentHookMetadataValue" function.
 */
export type GetCommentHookMetadataValueParams = {
  commentId: AbiParameterToPrimitiveType<{"internalType":"bytes32","name":"commentId","type":"bytes32"}>
key: AbiParameterToPrimitiveType<{"internalType":"bytes32","name":"key","type":"bytes32"}>
};

/**
 * Calls the "getCommentHookMetadataValue" function on the contract.
 * @param options - The options for the getCommentHookMetadataValue function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { getCommentHookMetadataValue } from "TODO";
 *
 * const result = await getCommentHookMetadataValue({
 *  commentId: ...,
 *  key: ...,
 * });
 *
 * ```
 */
export async function getCommentHookMetadataValue(
  options: BaseTransactionOptions<GetCommentHookMetadataValueParams>
) {
  return readContract({
    contract: options.contract,
    method: [
  "0xe367e350",
  [
    {
      "internalType": "bytes32",
      "name": "commentId",
      "type": "bytes32"
    },
    {
      "internalType": "bytes32",
      "name": "key",
      "type": "bytes32"
    }
  ],
  [
    {
      "internalType": "bytes",
      "name": "",
      "type": "bytes"
    }
  ]
],
    params: [options.commentId, options.key]
  });
};


/**
 * Represents the parameters for the "getCommentId" function.
 */
export type GetCommentIdParams = {
  commentData: AbiParameterToPrimitiveType<{"components":[{"internalType":"address","name":"author","type":"address"},{"internalType":"address","name":"app","type":"address"},{"internalType":"uint256","name":"channelId","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"bytes32","name":"parentId","type":"bytes32"},{"internalType":"uint8","name":"commentType","type":"uint8"},{"internalType":"string","name":"content","type":"string"},{"components":[{"internalType":"bytes32","name":"key","type":"bytes32"},{"internalType":"bytes","name":"value","type":"bytes"}],"internalType":"struct Metadata.MetadataEntry[]","name":"metadata","type":"tuple[]"},{"internalType":"string","name":"targetUri","type":"string"}],"internalType":"struct Comments.CreateComment","name":"commentData","type":"tuple"}>
};

/**
 * Calls the "getCommentId" function on the contract.
 * @param options - The options for the getCommentId function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { getCommentId } from "TODO";
 *
 * const result = await getCommentId({
 *  commentData: ...,
 * });
 *
 * ```
 */
export async function getCommentId(
  options: BaseTransactionOptions<GetCommentIdParams>
) {
  return readContract({
    contract: options.contract,
    method: [
  "0x6fab4364",
  [
    {
      "components": [
        {
          "internalType": "address",
          "name": "author",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "app",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "channelId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "deadline",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "parentId",
          "type": "bytes32"
        },
        {
          "internalType": "uint8",
          "name": "commentType",
          "type": "uint8"
        },
        {
          "internalType": "string",
          "name": "content",
          "type": "string"
        },
        {
          "components": [
            {
              "internalType": "bytes32",
              "name": "key",
              "type": "bytes32"
            },
            {
              "internalType": "bytes",
              "name": "value",
              "type": "bytes"
            }
          ],
          "internalType": "struct Metadata.MetadataEntry[]",
          "name": "metadata",
          "type": "tuple[]"
        },
        {
          "internalType": "string",
          "name": "targetUri",
          "type": "string"
        }
      ],
      "internalType": "struct Comments.CreateComment",
      "name": "commentData",
      "type": "tuple"
    }
  ],
  [
    {
      "internalType": "bytes32",
      "name": "",
      "type": "bytes32"
    }
  ]
],
    params: [options.commentData]
  });
};


/**
 * Represents the parameters for the "getCommentMetadata" function.
 */
export type GetCommentMetadataParams = {
  commentId: AbiParameterToPrimitiveType<{"internalType":"bytes32","name":"commentId","type":"bytes32"}>
};

/**
 * Calls the "getCommentMetadata" function on the contract.
 * @param options - The options for the getCommentMetadata function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { getCommentMetadata } from "TODO";
 *
 * const result = await getCommentMetadata({
 *  commentId: ...,
 * });
 *
 * ```
 */
export async function getCommentMetadata(
  options: BaseTransactionOptions<GetCommentMetadataParams>
) {
  return readContract({
    contract: options.contract,
    method: [
  "0x05c9a5d1",
  [
    {
      "internalType": "bytes32",
      "name": "commentId",
      "type": "bytes32"
    }
  ],
  [
    {
      "components": [
        {
          "internalType": "bytes32",
          "name": "key",
          "type": "bytes32"
        },
        {
          "internalType": "bytes",
          "name": "value",
          "type": "bytes"
        }
      ],
      "internalType": "struct Metadata.MetadataEntry[]",
      "name": "",
      "type": "tuple[]"
    }
  ]
],
    params: [options.commentId]
  });
};


/**
 * Represents the parameters for the "getCommentMetadataKeys" function.
 */
export type GetCommentMetadataKeysParams = {
  commentId: AbiParameterToPrimitiveType<{"internalType":"bytes32","name":"commentId","type":"bytes32"}>
};

/**
 * Calls the "getCommentMetadataKeys" function on the contract.
 * @param options - The options for the getCommentMetadataKeys function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { getCommentMetadataKeys } from "TODO";
 *
 * const result = await getCommentMetadataKeys({
 *  commentId: ...,
 * });
 *
 * ```
 */
export async function getCommentMetadataKeys(
  options: BaseTransactionOptions<GetCommentMetadataKeysParams>
) {
  return readContract({
    contract: options.contract,
    method: [
  "0x56380be2",
  [
    {
      "internalType": "bytes32",
      "name": "commentId",
      "type": "bytes32"
    }
  ],
  [
    {
      "internalType": "bytes32[]",
      "name": "",
      "type": "bytes32[]"
    }
  ]
],
    params: [options.commentId]
  });
};


/**
 * Represents the parameters for the "getCommentMetadataValue" function.
 */
export type GetCommentMetadataValueParams = {
  commentId: AbiParameterToPrimitiveType<{"internalType":"bytes32","name":"commentId","type":"bytes32"}>
key: AbiParameterToPrimitiveType<{"internalType":"bytes32","name":"key","type":"bytes32"}>
};

/**
 * Calls the "getCommentMetadataValue" function on the contract.
 * @param options - The options for the getCommentMetadataValue function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { getCommentMetadataValue } from "TODO";
 *
 * const result = await getCommentMetadataValue({
 *  commentId: ...,
 *  key: ...,
 * });
 *
 * ```
 */
export async function getCommentMetadataValue(
  options: BaseTransactionOptions<GetCommentMetadataValueParams>
) {
  return readContract({
    contract: options.contract,
    method: [
  "0x6e0ce000",
  [
    {
      "internalType": "bytes32",
      "name": "commentId",
      "type": "bytes32"
    },
    {
      "internalType": "bytes32",
      "name": "key",
      "type": "bytes32"
    }
  ],
  [
    {
      "internalType": "bytes",
      "name": "",
      "type": "bytes"
    }
  ]
],
    params: [options.commentId, options.key]
  });
};


/**
 * Represents the parameters for the "getDeleteCommentHash" function.
 */
export type GetDeleteCommentHashParams = {
  commentId: AbiParameterToPrimitiveType<{"internalType":"bytes32","name":"commentId","type":"bytes32"}>
author: AbiParameterToPrimitiveType<{"internalType":"address","name":"author","type":"address"}>
app: AbiParameterToPrimitiveType<{"internalType":"address","name":"app","type":"address"}>
deadline: AbiParameterToPrimitiveType<{"internalType":"uint256","name":"deadline","type":"uint256"}>
};

/**
 * Calls the "getDeleteCommentHash" function on the contract.
 * @param options - The options for the getDeleteCommentHash function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { getDeleteCommentHash } from "TODO";
 *
 * const result = await getDeleteCommentHash({
 *  commentId: ...,
 *  author: ...,
 *  app: ...,
 *  deadline: ...,
 * });
 *
 * ```
 */
export async function getDeleteCommentHash(
  options: BaseTransactionOptions<GetDeleteCommentHashParams>
) {
  return readContract({
    contract: options.contract,
    method: [
  "0x2d229e71",
  [
    {
      "internalType": "bytes32",
      "name": "commentId",
      "type": "bytes32"
    },
    {
      "internalType": "address",
      "name": "author",
      "type": "address"
    },
    {
      "internalType": "address",
      "name": "app",
      "type": "address"
    },
    {
      "internalType": "uint256",
      "name": "deadline",
      "type": "uint256"
    }
  ],
  [
    {
      "internalType": "bytes32",
      "name": "",
      "type": "bytes32"
    }
  ]
],
    params: [options.commentId, options.author, options.app, options.deadline]
  });
};


/**
 * Represents the parameters for the "getEditCommentHash" function.
 */
export type GetEditCommentHashParams = {
  commentId: AbiParameterToPrimitiveType<{"internalType":"bytes32","name":"commentId","type":"bytes32"}>
author: AbiParameterToPrimitiveType<{"internalType":"address","name":"author","type":"address"}>
editData: AbiParameterToPrimitiveType<{"components":[{"internalType":"address","name":"app","type":"address"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"string","name":"content","type":"string"},{"components":[{"internalType":"bytes32","name":"key","type":"bytes32"},{"internalType":"bytes","name":"value","type":"bytes"}],"internalType":"struct Metadata.MetadataEntry[]","name":"metadata","type":"tuple[]"}],"internalType":"struct Comments.EditComment","name":"editData","type":"tuple"}>
};

/**
 * Calls the "getEditCommentHash" function on the contract.
 * @param options - The options for the getEditCommentHash function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { getEditCommentHash } from "TODO";
 *
 * const result = await getEditCommentHash({
 *  commentId: ...,
 *  author: ...,
 *  editData: ...,
 * });
 *
 * ```
 */
export async function getEditCommentHash(
  options: BaseTransactionOptions<GetEditCommentHashParams>
) {
  return readContract({
    contract: options.contract,
    method: [
  "0x1f3449fe",
  [
    {
      "internalType": "bytes32",
      "name": "commentId",
      "type": "bytes32"
    },
    {
      "internalType": "address",
      "name": "author",
      "type": "address"
    },
    {
      "components": [
        {
          "internalType": "address",
          "name": "app",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "nonce",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "deadline",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "content",
          "type": "string"
        },
        {
          "components": [
            {
              "internalType": "bytes32",
              "name": "key",
              "type": "bytes32"
            },
            {
              "internalType": "bytes",
              "name": "value",
              "type": "bytes"
            }
          ],
          "internalType": "struct Metadata.MetadataEntry[]",
          "name": "metadata",
          "type": "tuple[]"
        }
      ],
      "internalType": "struct Comments.EditComment",
      "name": "editData",
      "type": "tuple"
    }
  ],
  [
    {
      "internalType": "bytes32",
      "name": "",
      "type": "bytes32"
    }
  ]
],
    params: [options.commentId, options.author, options.editData]
  });
};


/**
 * Represents the parameters for the "getNonce" function.
 */
export type GetNonceParams = {
  author: AbiParameterToPrimitiveType<{"internalType":"address","name":"author","type":"address"}>
app: AbiParameterToPrimitiveType<{"internalType":"address","name":"app","type":"address"}>
};

/**
 * Calls the "getNonce" function on the contract.
 * @param options - The options for the getNonce function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { getNonce } from "TODO";
 *
 * const result = await getNonce({
 *  author: ...,
 *  app: ...,
 * });
 *
 * ```
 */
export async function getNonce(
  options: BaseTransactionOptions<GetNonceParams>
) {
  return readContract({
    contract: options.contract,
    method: [
  "0xd828435d",
  [
    {
      "internalType": "address",
      "name": "author",
      "type": "address"
    },
    {
      "internalType": "address",
      "name": "app",
      "type": "address"
    }
  ],
  [
    {
      "internalType": "uint256",
      "name": "",
      "type": "uint256"
    }
  ]
],
    params: [options.author, options.app]
  });
};


/**
 * Represents the parameters for the "getRemoveApprovalHash" function.
 */
export type GetRemoveApprovalHashParams = {
  author: AbiParameterToPrimitiveType<{"internalType":"address","name":"author","type":"address"}>
app: AbiParameterToPrimitiveType<{"internalType":"address","name":"app","type":"address"}>
nonce: AbiParameterToPrimitiveType<{"internalType":"uint256","name":"nonce","type":"uint256"}>
deadline: AbiParameterToPrimitiveType<{"internalType":"uint256","name":"deadline","type":"uint256"}>
};

/**
 * Calls the "getRemoveApprovalHash" function on the contract.
 * @param options - The options for the getRemoveApprovalHash function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { getRemoveApprovalHash } from "TODO";
 *
 * const result = await getRemoveApprovalHash({
 *  author: ...,
 *  app: ...,
 *  nonce: ...,
 *  deadline: ...,
 * });
 *
 * ```
 */
export async function getRemoveApprovalHash(
  options: BaseTransactionOptions<GetRemoveApprovalHashParams>
) {
  return readContract({
    contract: options.contract,
    method: [
  "0x035e3b75",
  [
    {
      "internalType": "address",
      "name": "author",
      "type": "address"
    },
    {
      "internalType": "address",
      "name": "app",
      "type": "address"
    },
    {
      "internalType": "uint256",
      "name": "nonce",
      "type": "uint256"
    },
    {
      "internalType": "uint256",
      "name": "deadline",
      "type": "uint256"
    }
  ],
  [
    {
      "internalType": "bytes32",
      "name": "",
      "type": "bytes32"
    }
  ]
],
    params: [options.author, options.app, options.nonce, options.deadline]
  });
};


/**
 * Represents the parameters for the "isApproved" function.
 */
export type IsApprovedParams = {
  author: AbiParameterToPrimitiveType<{"internalType":"address","name":"author","type":"address"}>
app: AbiParameterToPrimitiveType<{"internalType":"address","name":"app","type":"address"}>
};

/**
 * Calls the "isApproved" function on the contract.
 * @param options - The options for the isApproved function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { isApproved } from "TODO";
 *
 * const result = await isApproved({
 *  author: ...,
 *  app: ...,
 * });
 *
 * ```
 */
export async function isApproved(
  options: BaseTransactionOptions<IsApprovedParams>
) {
  return readContract({
    contract: options.contract,
    method: [
  "0xa389783e",
  [
    {
      "internalType": "address",
      "name": "author",
      "type": "address"
    },
    {
      "internalType": "address",
      "name": "app",
      "type": "address"
    }
  ],
  [
    {
      "internalType": "bool",
      "name": "",
      "type": "bool"
    }
  ]
],
    params: [options.author, options.app]
  });
};


/**
 * Represents the parameters for the "isDeleted" function.
 */
export type IsDeletedParams = {
  commentId: AbiParameterToPrimitiveType<{"internalType":"bytes32","name":"commentId","type":"bytes32"}>
};

/**
 * Calls the "isDeleted" function on the contract.
 * @param options - The options for the isDeleted function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { isDeleted } from "TODO";
 *
 * const result = await isDeleted({
 *  commentId: ...,
 * });
 *
 * ```
 */
export async function isDeleted(
  options: BaseTransactionOptions<IsDeletedParams>
) {
  return readContract({
    contract: options.contract,
    method: [
  "0x67823325",
  [
    {
      "internalType": "bytes32",
      "name": "commentId",
      "type": "bytes32"
    }
  ],
  [
    {
      "internalType": "bool",
      "name": "",
      "type": "bool"
    }
  ]
],
    params: [options.commentId]
  });
};




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
export async function name(
  options: BaseTransactionOptions
) {
  return readContract({
    contract: options.contract,
    method: [
  "0x06fdde03",
  [],
  [
    {
      "internalType": "string",
      "name": "",
      "type": "string"
    }
  ]
],
    params: []
  });
};




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
export async function owner(
  options: BaseTransactionOptions
) {
  return readContract({
    contract: options.contract,
    method: [
  "0x8da5cb5b",
  [],
  [
    {
      "internalType": "address",
      "name": "result",
      "type": "address"
    }
  ]
],
    params: []
  });
};


/**
 * Represents the parameters for the "ownershipHandoverExpiresAt" function.
 */
export type OwnershipHandoverExpiresAtParams = {
  pendingOwner: AbiParameterToPrimitiveType<{"internalType":"address","name":"pendingOwner","type":"address"}>
};

/**
 * Calls the "ownershipHandoverExpiresAt" function on the contract.
 * @param options - The options for the ownershipHandoverExpiresAt function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { ownershipHandoverExpiresAt } from "TODO";
 *
 * const result = await ownershipHandoverExpiresAt({
 *  pendingOwner: ...,
 * });
 *
 * ```
 */
export async function ownershipHandoverExpiresAt(
  options: BaseTransactionOptions<OwnershipHandoverExpiresAtParams>
) {
  return readContract({
    contract: options.contract,
    method: [
  "0xfee81cf4",
  [
    {
      "internalType": "address",
      "name": "pendingOwner",
      "type": "address"
    }
  ],
  [
    {
      "internalType": "uint256",
      "name": "result",
      "type": "uint256"
    }
  ]
],
    params: [options.pendingOwner]
  });
};




/**
 * Calls the "version" function on the contract.
 * @param options - The options for the version function.
 * @returns The parsed result of the function call.
 * @example
 * ```
 * import { version } from "TODO";
 *
 * const result = await version();
 *
 * ```
 */
export async function version(
  options: BaseTransactionOptions
) {
  return readContract({
    contract: options.contract,
    method: [
  "0x54fd4d50",
  [],
  [
    {
      "internalType": "string",
      "name": "",
      "type": "string"
    }
  ]
],
    params: []
  });
};


/**
* Contract write functions
*/

/**
 * Represents the parameters for the "addApproval" function.
 */
export type AddApprovalParams = {
  app: AbiParameterToPrimitiveType<{"internalType":"address","name":"app","type":"address"}>
expiry: AbiParameterToPrimitiveType<{"internalType":"uint256","name":"expiry","type":"uint256"}>
};

/**
 * Calls the "addApproval" function on the contract.
 * @param options - The options for the "addApproval" function.
 * @returns A prepared transaction object.
 * @example
 * ```
 * import { addApproval } from "TODO";
 *
 * const transaction = addApproval({
 *  app: ...,
 *  expiry: ...,
 * });
 *
 * // Send the transaction
 * ...
 *
 * ```
 */
export function addApproval(
  options: BaseTransactionOptions<AddApprovalParams>
) {
  return prepareContractCall({
    contract: options.contract,
    method: [
  "0xac3cb72c",
  [
    {
      "internalType": "address",
      "name": "app",
      "type": "address"
    },
    {
      "internalType": "uint256",
      "name": "expiry",
      "type": "uint256"
    }
  ],
  []
],
    params: [options.app, options.expiry]
  });
};


/**
 * Represents the parameters for the "addApprovalWithSig" function.
 */
export type AddApprovalWithSigParams = {
  author: AbiParameterToPrimitiveType<{"internalType":"address","name":"author","type":"address"}>
app: AbiParameterToPrimitiveType<{"internalType":"address","name":"app","type":"address"}>
expiry: AbiParameterToPrimitiveType<{"internalType":"uint256","name":"expiry","type":"uint256"}>
nonce: AbiParameterToPrimitiveType<{"internalType":"uint256","name":"nonce","type":"uint256"}>
deadline: AbiParameterToPrimitiveType<{"internalType":"uint256","name":"deadline","type":"uint256"}>
authorSignature: AbiParameterToPrimitiveType<{"internalType":"bytes","name":"authorSignature","type":"bytes"}>
};

/**
 * Calls the "addApprovalWithSig" function on the contract.
 * @param options - The options for the "addApprovalWithSig" function.
 * @returns A prepared transaction object.
 * @example
 * ```
 * import { addApprovalWithSig } from "TODO";
 *
 * const transaction = addApprovalWithSig({
 *  author: ...,
 *  app: ...,
 *  expiry: ...,
 *  nonce: ...,
 *  deadline: ...,
 *  authorSignature: ...,
 * });
 *
 * // Send the transaction
 * ...
 *
 * ```
 */
export function addApprovalWithSig(
  options: BaseTransactionOptions<AddApprovalWithSigParams>
) {
  return prepareContractCall({
    contract: options.contract,
    method: [
  "0x2119073c",
  [
    {
      "internalType": "address",
      "name": "author",
      "type": "address"
    },
    {
      "internalType": "address",
      "name": "app",
      "type": "address"
    },
    {
      "internalType": "uint256",
      "name": "expiry",
      "type": "uint256"
    },
    {
      "internalType": "uint256",
      "name": "nonce",
      "type": "uint256"
    },
    {
      "internalType": "uint256",
      "name": "deadline",
      "type": "uint256"
    },
    {
      "internalType": "bytes",
      "name": "authorSignature",
      "type": "bytes"
    }
  ],
  []
],
    params: [options.author, options.app, options.expiry, options.nonce, options.deadline, options.authorSignature]
  });
};


/**
 * Represents the parameters for the "batchOperations" function.
 */
export type BatchOperationsParams = {
  operations: AbiParameterToPrimitiveType<{"components":[{"internalType":"enum Comments.BatchOperationType","name":"operationType","type":"uint8"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"bytes","name":"data","type":"bytes"},{"internalType":"bytes[]","name":"signatures","type":"bytes[]"}],"internalType":"struct Comments.BatchOperation[]","name":"operations","type":"tuple[]"}>
};

/**
 * Calls the "batchOperations" function on the contract.
 * @param options - The options for the "batchOperations" function.
 * @returns A prepared transaction object.
 * @example
 * ```
 * import { batchOperations } from "TODO";
 *
 * const transaction = batchOperations({
 *  operations: ...,
 * });
 *
 * // Send the transaction
 * ...
 *
 * ```
 */
export function batchOperations(
  options: BaseTransactionOptions<BatchOperationsParams>
) {
  return prepareContractCall({
    contract: options.contract,
    method: [
  "0xfe1f2d70",
  [
    {
      "components": [
        {
          "internalType": "enum Comments.BatchOperationType",
          "name": "operationType",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        },
        {
          "internalType": "bytes",
          "name": "data",
          "type": "bytes"
        },
        {
          "internalType": "bytes[]",
          "name": "signatures",
          "type": "bytes[]"
        }
      ],
      "internalType": "struct Comments.BatchOperation[]",
      "name": "operations",
      "type": "tuple[]"
    }
  ],
  [
    {
      "internalType": "bytes[]",
      "name": "results",
      "type": "bytes[]"
    }
  ]
],
    params: [options.operations]
  });
};




/**
 * Calls the "cancelOwnershipHandover" function on the contract.
 * @param options - The options for the "cancelOwnershipHandover" function.
 * @returns A prepared transaction object.
 * @example
 * ```
 * import { cancelOwnershipHandover } from "TODO";
 *
 * const transaction = cancelOwnershipHandover();
 *
 * // Send the transaction
 * ...
 *
 * ```
 */
export function cancelOwnershipHandover(
  options: BaseTransactionOptions
) {
  return prepareContractCall({
    contract: options.contract,
    method: [
  "0x54d1f13d",
  [],
  []
],
    params: []
  });
};


/**
 * Represents the parameters for the "completeOwnershipHandover" function.
 */
export type CompleteOwnershipHandoverParams = {
  pendingOwner: AbiParameterToPrimitiveType<{"internalType":"address","name":"pendingOwner","type":"address"}>
};

/**
 * Calls the "completeOwnershipHandover" function on the contract.
 * @param options - The options for the "completeOwnershipHandover" function.
 * @returns A prepared transaction object.
 * @example
 * ```
 * import { completeOwnershipHandover } from "TODO";
 *
 * const transaction = completeOwnershipHandover({
 *  pendingOwner: ...,
 * });
 *
 * // Send the transaction
 * ...
 *
 * ```
 */
export function completeOwnershipHandover(
  options: BaseTransactionOptions<CompleteOwnershipHandoverParams>
) {
  return prepareContractCall({
    contract: options.contract,
    method: [
  "0xf04e283e",
  [
    {
      "internalType": "address",
      "name": "pendingOwner",
      "type": "address"
    }
  ],
  []
],
    params: [options.pendingOwner]
  });
};


/**
 * Represents the parameters for the "deleteComment" function.
 */
export type DeleteCommentParams = {
  commentId: AbiParameterToPrimitiveType<{"internalType":"bytes32","name":"commentId","type":"bytes32"}>
};

/**
 * Calls the "deleteComment" function on the contract.
 * @param options - The options for the "deleteComment" function.
 * @returns A prepared transaction object.
 * @example
 * ```
 * import { deleteComment } from "TODO";
 *
 * const transaction = deleteComment({
 *  commentId: ...,
 * });
 *
 * // Send the transaction
 * ...
 *
 * ```
 */
export function deleteComment(
  options: BaseTransactionOptions<DeleteCommentParams>
) {
  return prepareContractCall({
    contract: options.contract,
    method: [
  "0x58595ba4",
  [
    {
      "internalType": "bytes32",
      "name": "commentId",
      "type": "bytes32"
    }
  ],
  []
],
    params: [options.commentId]
  });
};


/**
 * Represents the parameters for the "deleteCommentWithSig" function.
 */
export type DeleteCommentWithSigParams = {
  commentId: AbiParameterToPrimitiveType<{"internalType":"bytes32","name":"commentId","type":"bytes32"}>
app: AbiParameterToPrimitiveType<{"internalType":"address","name":"app","type":"address"}>
deadline: AbiParameterToPrimitiveType<{"internalType":"uint256","name":"deadline","type":"uint256"}>
authorSignature: AbiParameterToPrimitiveType<{"internalType":"bytes","name":"authorSignature","type":"bytes"}>
appSignature: AbiParameterToPrimitiveType<{"internalType":"bytes","name":"appSignature","type":"bytes"}>
};

/**
 * Calls the "deleteCommentWithSig" function on the contract.
 * @param options - The options for the "deleteCommentWithSig" function.
 * @returns A prepared transaction object.
 * @example
 * ```
 * import { deleteCommentWithSig } from "TODO";
 *
 * const transaction = deleteCommentWithSig({
 *  commentId: ...,
 *  app: ...,
 *  deadline: ...,
 *  authorSignature: ...,
 *  appSignature: ...,
 * });
 *
 * // Send the transaction
 * ...
 *
 * ```
 */
export function deleteCommentWithSig(
  options: BaseTransactionOptions<DeleteCommentWithSigParams>
) {
  return prepareContractCall({
    contract: options.contract,
    method: [
  "0x4b88f91e",
  [
    {
      "internalType": "bytes32",
      "name": "commentId",
      "type": "bytes32"
    },
    {
      "internalType": "address",
      "name": "app",
      "type": "address"
    },
    {
      "internalType": "uint256",
      "name": "deadline",
      "type": "uint256"
    },
    {
      "internalType": "bytes",
      "name": "authorSignature",
      "type": "bytes"
    },
    {
      "internalType": "bytes",
      "name": "appSignature",
      "type": "bytes"
    }
  ],
  []
],
    params: [options.commentId, options.app, options.deadline, options.authorSignature, options.appSignature]
  });
};


/**
 * Represents the parameters for the "editComment" function.
 */
export type EditCommentParams = {
  commentId: AbiParameterToPrimitiveType<{"internalType":"bytes32","name":"commentId","type":"bytes32"}>
editData: AbiParameterToPrimitiveType<{"components":[{"internalType":"address","name":"app","type":"address"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"string","name":"content","type":"string"},{"components":[{"internalType":"bytes32","name":"key","type":"bytes32"},{"internalType":"bytes","name":"value","type":"bytes"}],"internalType":"struct Metadata.MetadataEntry[]","name":"metadata","type":"tuple[]"}],"internalType":"struct Comments.EditComment","name":"editData","type":"tuple"}>
appSignature: AbiParameterToPrimitiveType<{"internalType":"bytes","name":"appSignature","type":"bytes"}>
};

/**
 * Calls the "editComment" function on the contract.
 * @param options - The options for the "editComment" function.
 * @returns A prepared transaction object.
 * @example
 * ```
 * import { editComment } from "TODO";
 *
 * const transaction = editComment({
 *  commentId: ...,
 *  editData: ...,
 *  appSignature: ...,
 * });
 *
 * // Send the transaction
 * ...
 *
 * ```
 */
export function editComment(
  options: BaseTransactionOptions<EditCommentParams>
) {
  return prepareContractCall({
    contract: options.contract,
    method: [
  "0x558724a5",
  [
    {
      "internalType": "bytes32",
      "name": "commentId",
      "type": "bytes32"
    },
    {
      "components": [
        {
          "internalType": "address",
          "name": "app",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "nonce",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "deadline",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "content",
          "type": "string"
        },
        {
          "components": [
            {
              "internalType": "bytes32",
              "name": "key",
              "type": "bytes32"
            },
            {
              "internalType": "bytes",
              "name": "value",
              "type": "bytes"
            }
          ],
          "internalType": "struct Metadata.MetadataEntry[]",
          "name": "metadata",
          "type": "tuple[]"
        }
      ],
      "internalType": "struct Comments.EditComment",
      "name": "editData",
      "type": "tuple"
    },
    {
      "internalType": "bytes",
      "name": "appSignature",
      "type": "bytes"
    }
  ],
  []
],
    params: [options.commentId, options.editData, options.appSignature]
  });
};


/**
 * Represents the parameters for the "editCommentWithSig" function.
 */
export type EditCommentWithSigParams = {
  commentId: AbiParameterToPrimitiveType<{"internalType":"bytes32","name":"commentId","type":"bytes32"}>
editData: AbiParameterToPrimitiveType<{"components":[{"internalType":"address","name":"app","type":"address"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"string","name":"content","type":"string"},{"components":[{"internalType":"bytes32","name":"key","type":"bytes32"},{"internalType":"bytes","name":"value","type":"bytes"}],"internalType":"struct Metadata.MetadataEntry[]","name":"metadata","type":"tuple[]"}],"internalType":"struct Comments.EditComment","name":"editData","type":"tuple"}>
authorSignature: AbiParameterToPrimitiveType<{"internalType":"bytes","name":"authorSignature","type":"bytes"}>
appSignature: AbiParameterToPrimitiveType<{"internalType":"bytes","name":"appSignature","type":"bytes"}>
};

/**
 * Calls the "editCommentWithSig" function on the contract.
 * @param options - The options for the "editCommentWithSig" function.
 * @returns A prepared transaction object.
 * @example
 * ```
 * import { editCommentWithSig } from "TODO";
 *
 * const transaction = editCommentWithSig({
 *  commentId: ...,
 *  editData: ...,
 *  authorSignature: ...,
 *  appSignature: ...,
 * });
 *
 * // Send the transaction
 * ...
 *
 * ```
 */
export function editCommentWithSig(
  options: BaseTransactionOptions<EditCommentWithSigParams>
) {
  return prepareContractCall({
    contract: options.contract,
    method: [
  "0x24d42079",
  [
    {
      "internalType": "bytes32",
      "name": "commentId",
      "type": "bytes32"
    },
    {
      "components": [
        {
          "internalType": "address",
          "name": "app",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "nonce",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "deadline",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "content",
          "type": "string"
        },
        {
          "components": [
            {
              "internalType": "bytes32",
              "name": "key",
              "type": "bytes32"
            },
            {
              "internalType": "bytes",
              "name": "value",
              "type": "bytes"
            }
          ],
          "internalType": "struct Metadata.MetadataEntry[]",
          "name": "metadata",
          "type": "tuple[]"
        }
      ],
      "internalType": "struct Comments.EditComment",
      "name": "editData",
      "type": "tuple"
    },
    {
      "internalType": "bytes",
      "name": "authorSignature",
      "type": "bytes"
    },
    {
      "internalType": "bytes",
      "name": "appSignature",
      "type": "bytes"
    }
  ],
  []
],
    params: [options.commentId, options.editData, options.authorSignature, options.appSignature]
  });
};


/**
 * Represents the parameters for the "postComment" function.
 */
export type PostCommentParams = {
  commentData: AbiParameterToPrimitiveType<{"components":[{"internalType":"address","name":"author","type":"address"},{"internalType":"address","name":"app","type":"address"},{"internalType":"uint256","name":"channelId","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"bytes32","name":"parentId","type":"bytes32"},{"internalType":"uint8","name":"commentType","type":"uint8"},{"internalType":"string","name":"content","type":"string"},{"components":[{"internalType":"bytes32","name":"key","type":"bytes32"},{"internalType":"bytes","name":"value","type":"bytes"}],"internalType":"struct Metadata.MetadataEntry[]","name":"metadata","type":"tuple[]"},{"internalType":"string","name":"targetUri","type":"string"}],"internalType":"struct Comments.CreateComment","name":"commentData","type":"tuple"}>
appSignature: AbiParameterToPrimitiveType<{"internalType":"bytes","name":"appSignature","type":"bytes"}>
};

/**
 * Calls the "postComment" function on the contract.
 * @param options - The options for the "postComment" function.
 * @returns A prepared transaction object.
 * @example
 * ```
 * import { postComment } from "TODO";
 *
 * const transaction = postComment({
 *  commentData: ...,
 *  appSignature: ...,
 * });
 *
 * // Send the transaction
 * ...
 *
 * ```
 */
export function postComment(
  options: BaseTransactionOptions<PostCommentParams>
) {
  return prepareContractCall({
    contract: options.contract,
    method: [
  "0x762c08e2",
  [
    {
      "components": [
        {
          "internalType": "address",
          "name": "author",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "app",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "channelId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "deadline",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "parentId",
          "type": "bytes32"
        },
        {
          "internalType": "uint8",
          "name": "commentType",
          "type": "uint8"
        },
        {
          "internalType": "string",
          "name": "content",
          "type": "string"
        },
        {
          "components": [
            {
              "internalType": "bytes32",
              "name": "key",
              "type": "bytes32"
            },
            {
              "internalType": "bytes",
              "name": "value",
              "type": "bytes"
            }
          ],
          "internalType": "struct Metadata.MetadataEntry[]",
          "name": "metadata",
          "type": "tuple[]"
        },
        {
          "internalType": "string",
          "name": "targetUri",
          "type": "string"
        }
      ],
      "internalType": "struct Comments.CreateComment",
      "name": "commentData",
      "type": "tuple"
    },
    {
      "internalType": "bytes",
      "name": "appSignature",
      "type": "bytes"
    }
  ],
  [
    {
      "internalType": "bytes32",
      "name": "",
      "type": "bytes32"
    }
  ]
],
    params: [options.commentData, options.appSignature]
  });
};


/**
 * Represents the parameters for the "postCommentWithSig" function.
 */
export type PostCommentWithSigParams = {
  commentData: AbiParameterToPrimitiveType<{"components":[{"internalType":"address","name":"author","type":"address"},{"internalType":"address","name":"app","type":"address"},{"internalType":"uint256","name":"channelId","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"bytes32","name":"parentId","type":"bytes32"},{"internalType":"uint8","name":"commentType","type":"uint8"},{"internalType":"string","name":"content","type":"string"},{"components":[{"internalType":"bytes32","name":"key","type":"bytes32"},{"internalType":"bytes","name":"value","type":"bytes"}],"internalType":"struct Metadata.MetadataEntry[]","name":"metadata","type":"tuple[]"},{"internalType":"string","name":"targetUri","type":"string"}],"internalType":"struct Comments.CreateComment","name":"commentData","type":"tuple"}>
authorSignature: AbiParameterToPrimitiveType<{"internalType":"bytes","name":"authorSignature","type":"bytes"}>
appSignature: AbiParameterToPrimitiveType<{"internalType":"bytes","name":"appSignature","type":"bytes"}>
};

/**
 * Calls the "postCommentWithSig" function on the contract.
 * @param options - The options for the "postCommentWithSig" function.
 * @returns A prepared transaction object.
 * @example
 * ```
 * import { postCommentWithSig } from "TODO";
 *
 * const transaction = postCommentWithSig({
 *  commentData: ...,
 *  authorSignature: ...,
 *  appSignature: ...,
 * });
 *
 * // Send the transaction
 * ...
 *
 * ```
 */
export function postCommentWithSig(
  options: BaseTransactionOptions<PostCommentWithSigParams>
) {
  return prepareContractCall({
    contract: options.contract,
    method: [
  "0x385f4877",
  [
    {
      "components": [
        {
          "internalType": "address",
          "name": "author",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "app",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "channelId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "deadline",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "parentId",
          "type": "bytes32"
        },
        {
          "internalType": "uint8",
          "name": "commentType",
          "type": "uint8"
        },
        {
          "internalType": "string",
          "name": "content",
          "type": "string"
        },
        {
          "components": [
            {
              "internalType": "bytes32",
              "name": "key",
              "type": "bytes32"
            },
            {
              "internalType": "bytes",
              "name": "value",
              "type": "bytes"
            }
          ],
          "internalType": "struct Metadata.MetadataEntry[]",
          "name": "metadata",
          "type": "tuple[]"
        },
        {
          "internalType": "string",
          "name": "targetUri",
          "type": "string"
        }
      ],
      "internalType": "struct Comments.CreateComment",
      "name": "commentData",
      "type": "tuple"
    },
    {
      "internalType": "bytes",
      "name": "authorSignature",
      "type": "bytes"
    },
    {
      "internalType": "bytes",
      "name": "appSignature",
      "type": "bytes"
    }
  ],
  [
    {
      "internalType": "bytes32",
      "name": "",
      "type": "bytes32"
    }
  ]
],
    params: [options.commentData, options.authorSignature, options.appSignature]
  });
};


/**
 * Represents the parameters for the "removeApprovalWithSig" function.
 */
export type RemoveApprovalWithSigParams = {
  author: AbiParameterToPrimitiveType<{"internalType":"address","name":"author","type":"address"}>
app: AbiParameterToPrimitiveType<{"internalType":"address","name":"app","type":"address"}>
nonce: AbiParameterToPrimitiveType<{"internalType":"uint256","name":"nonce","type":"uint256"}>
deadline: AbiParameterToPrimitiveType<{"internalType":"uint256","name":"deadline","type":"uint256"}>
authorSignature: AbiParameterToPrimitiveType<{"internalType":"bytes","name":"authorSignature","type":"bytes"}>
};

/**
 * Calls the "removeApprovalWithSig" function on the contract.
 * @param options - The options for the "removeApprovalWithSig" function.
 * @returns A prepared transaction object.
 * @example
 * ```
 * import { removeApprovalWithSig } from "TODO";
 *
 * const transaction = removeApprovalWithSig({
 *  author: ...,
 *  app: ...,
 *  nonce: ...,
 *  deadline: ...,
 *  authorSignature: ...,
 * });
 *
 * // Send the transaction
 * ...
 *
 * ```
 */
export function removeApprovalWithSig(
  options: BaseTransactionOptions<RemoveApprovalWithSigParams>
) {
  return prepareContractCall({
    contract: options.contract,
    method: [
  "0x31c36024",
  [
    {
      "internalType": "address",
      "name": "author",
      "type": "address"
    },
    {
      "internalType": "address",
      "name": "app",
      "type": "address"
    },
    {
      "internalType": "uint256",
      "name": "nonce",
      "type": "uint256"
    },
    {
      "internalType": "uint256",
      "name": "deadline",
      "type": "uint256"
    },
    {
      "internalType": "bytes",
      "name": "authorSignature",
      "type": "bytes"
    }
  ],
  []
],
    params: [options.author, options.app, options.nonce, options.deadline, options.authorSignature]
  });
};




/**
 * Calls the "renounceOwnership" function on the contract.
 * @param options - The options for the "renounceOwnership" function.
 * @returns A prepared transaction object.
 * @example
 * ```
 * import { renounceOwnership } from "TODO";
 *
 * const transaction = renounceOwnership();
 *
 * // Send the transaction
 * ...
 *
 * ```
 */
export function renounceOwnership(
  options: BaseTransactionOptions
) {
  return prepareContractCall({
    contract: options.contract,
    method: [
  "0x715018a6",
  [],
  []
],
    params: []
  });
};




/**
 * Calls the "requestOwnershipHandover" function on the contract.
 * @param options - The options for the "requestOwnershipHandover" function.
 * @returns A prepared transaction object.
 * @example
 * ```
 * import { requestOwnershipHandover } from "TODO";
 *
 * const transaction = requestOwnershipHandover();
 *
 * // Send the transaction
 * ...
 *
 * ```
 */
export function requestOwnershipHandover(
  options: BaseTransactionOptions
) {
  return prepareContractCall({
    contract: options.contract,
    method: [
  "0x25692962",
  [],
  []
],
    params: []
  });
};


/**
 * Represents the parameters for the "revokeApproval" function.
 */
export type RevokeApprovalParams = {
  app: AbiParameterToPrimitiveType<{"internalType":"address","name":"app","type":"address"}>
};

/**
 * Calls the "revokeApproval" function on the contract.
 * @param options - The options for the "revokeApproval" function.
 * @returns A prepared transaction object.
 * @example
 * ```
 * import { revokeApproval } from "TODO";
 *
 * const transaction = revokeApproval({
 *  app: ...,
 * });
 *
 * // Send the transaction
 * ...
 *
 * ```
 */
export function revokeApproval(
  options: BaseTransactionOptions<RevokeApprovalParams>
) {
  return prepareContractCall({
    contract: options.contract,
    method: [
  "0x484685b0",
  [
    {
      "internalType": "address",
      "name": "app",
      "type": "address"
    }
  ],
  []
],
    params: [options.app]
  });
};


/**
 * Represents the parameters for the "transferOwnership" function.
 */
export type TransferOwnershipParams = {
  newOwner: AbiParameterToPrimitiveType<{"internalType":"address","name":"newOwner","type":"address"}>
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
 *  newOwner: ...,
 * });
 *
 * // Send the transaction
 * ...
 *
 * ```
 */
export function transferOwnership(
  options: BaseTransactionOptions<TransferOwnershipParams>
) {
  return prepareContractCall({
    contract: options.contract,
    method: [
  "0xf2fde38b",
  [
    {
      "internalType": "address",
      "name": "newOwner",
      "type": "address"
    }
  ],
  []
],
    params: [options.newOwner]
  });
};


/**
 * Represents the parameters for the "updateChannelContract" function.
 */
export type UpdateChannelContractParams = {
  channelContract: AbiParameterToPrimitiveType<{"internalType":"address","name":"_channelContract","type":"address"}>
};

/**
 * Calls the "updateChannelContract" function on the contract.
 * @param options - The options for the "updateChannelContract" function.
 * @returns A prepared transaction object.
 * @example
 * ```
 * import { updateChannelContract } from "TODO";
 *
 * const transaction = updateChannelContract({
 *  channelContract: ...,
 * });
 *
 * // Send the transaction
 * ...
 *
 * ```
 */
export function updateChannelContract(
  options: BaseTransactionOptions<UpdateChannelContractParams>
) {
  return prepareContractCall({
    contract: options.contract,
    method: [
  "0x5ce96cf7",
  [
    {
      "internalType": "address",
      "name": "_channelContract",
      "type": "address"
    }
  ],
  []
],
    params: [options.channelContract]
  });
};


/**
 * Represents the parameters for the "updateCommentHookData" function.
 */
export type UpdateCommentHookDataParams = {
  commentId: AbiParameterToPrimitiveType<{"internalType":"bytes32","name":"commentId","type":"bytes32"}>
};

/**
 * Calls the "updateCommentHookData" function on the contract.
 * @param options - The options for the "updateCommentHookData" function.
 * @returns A prepared transaction object.
 * @example
 * ```
 * import { updateCommentHookData } from "TODO";
 *
 * const transaction = updateCommentHookData({
 *  commentId: ...,
 * });
 *
 * // Send the transaction
 * ...
 *
 * ```
 */
export function updateCommentHookData(
  options: BaseTransactionOptions<UpdateCommentHookDataParams>
) {
  return prepareContractCall({
    contract: options.contract,
    method: [
  "0xb5c775d5",
  [
    {
      "internalType": "bytes32",
      "name": "commentId",
      "type": "bytes32"
    }
  ],
  []
],
    params: [options.commentId]
  });
};


