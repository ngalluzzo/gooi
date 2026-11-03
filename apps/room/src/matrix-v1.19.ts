// Bundled from matrix-org/matrix-spec v1.19 (Apache-2.0) by apps/room/scripts/matrix-schemas.ts. Do not edit.
// Room edges check events against it at run time, and json-schema-to-ts derives their types from it.
export const MATRIX = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$defs": {
    "TextMessage": {
      "allOf": [
        {
          "title": "RoomEvent",
          "description": "Room Events have the following fields.",
          "allOf": [
            {
              "title": "SyncRoomEvent",
              "description": "In addition to the Event fields, Room Events have the following additional fields.",
              "allOf": [
                {
                  "description": "The basic set of fields all events must have.",
                  "properties": {
                    "content": {
                      "description": "The fields in this object will vary depending on the type of event. When interacting with the REST API, this is the HTTP body.",
                      "type": "object"
                    },
                    "type": {
                      "description": "The type of event, as defined by [the event type specification](/client-server-api/#types-of-room-events).",
                      "type": "string"
                    }
                  },
                  "required": [
                    "type",
                    "content"
                  ],
                  "title": "Event",
                  "type": "object"
                },
                {
                  "type": "object",
                  "properties": {
                    "event_id": {
                      "description": "The globally unique event identifier.",
                      "type": "string",
                      "format": "mx-event-id",
                      "pattern": "^\\$"
                    },
                    "sender": {
                      "description": "Contains the fully-qualified ID of the user who sent this event.",
                      "type": "string",
                      "format": "mx-user-id",
                      "pattern": "^@"
                    },
                    "origin_server_ts": {
                      "description": "Timestamp in milliseconds on originating homeserver when this event was sent.",
                      "type": "integer",
                      "format": "int64"
                    },
                    "unsigned": {
                      "title": "UnsignedData",
                      "type": "object",
                      "description": "Contains optional extra information about the event.",
                      "properties": {
                        "age": {
                          "description": "The time in milliseconds that has elapsed since the event was sent.",
                          "type": "integer"
                        }
                      }
                    }
                  },
                  "required": [
                    "event_id",
                    "sender",
                    "origin_server_ts"
                  ]
                }
              ]
            },
            {
              "type": "object",
              "properties": {
                "room_id": {
                  "description": "The ID of the room associated with this event. Will not be present on events\nthat arrive through `/sync`, despite being required everywhere else.",
                  "type": "string",
                  "format": "mx-room-id",
                  "pattern": "^!"
                }
              },
              "required": [
                "room_id"
              ]
            }
          ]
        }
      ],
      "description": "This message is the most basic message and is used to represent text.",
      "properties": {
        "content": {
          "properties": {
            "body": {
              "description": "The body of the message.",
              "type": "string"
            },
            "msgtype": {
              "enum": [
                "m.text"
              ],
              "type": "string"
            },
            "format": {
              "description": "The format used in the `formatted_body`. This is required if `formatted_body`\nis specified. Currently only `org.matrix.custom.html` is supported.",
              "type": "string"
            },
            "formatted_body": {
              "description": "The formatted version of the `body`. This is required if `format`\nis specified.",
              "type": "string"
            }
          },
          "required": [
            "msgtype",
            "body"
          ],
          "type": "object"
        },
        "type": {
          "enum": [
            "m.room.message"
          ],
          "type": "string"
        }
      },
      "title": "TextMessage",
      "type": "object"
    },
    "Member": {
      "allOf": [
        {
          "allOf": [
            {
              "title": "RoomEvent",
              "description": "Room Events have the following fields.",
              "allOf": [
                {
                  "title": "SyncRoomEvent",
                  "description": "In addition to the Event fields, Room Events have the following additional fields.",
                  "allOf": [
                    {
                      "description": "The basic set of fields all events must have.",
                      "properties": {
                        "content": {
                          "description": "The fields in this object will vary depending on the type of event. When interacting with the REST API, this is the HTTP body.",
                          "type": "object"
                        },
                        "type": {
                          "description": "The type of event, as defined by [the event type specification](/client-server-api/#types-of-room-events).",
                          "type": "string"
                        }
                      },
                      "required": [
                        "type",
                        "content"
                      ],
                      "title": "Event",
                      "type": "object"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "event_id": {
                          "description": "The globally unique event identifier.",
                          "type": "string",
                          "format": "mx-event-id",
                          "pattern": "^\\$"
                        },
                        "sender": {
                          "description": "Contains the fully-qualified ID of the user who sent this event.",
                          "type": "string",
                          "format": "mx-user-id",
                          "pattern": "^@"
                        },
                        "origin_server_ts": {
                          "description": "Timestamp in milliseconds on originating homeserver when this event was sent.",
                          "type": "integer",
                          "format": "int64"
                        },
                        "unsigned": {
                          "title": "UnsignedData",
                          "type": "object",
                          "description": "Contains optional extra information about the event.",
                          "properties": {
                            "age": {
                              "description": "The time in milliseconds that has elapsed since the event was sent.",
                              "type": "integer"
                            }
                          }
                        }
                      },
                      "required": [
                        "event_id",
                        "sender",
                        "origin_server_ts"
                      ]
                    }
                  ]
                },
                {
                  "type": "object",
                  "properties": {
                    "room_id": {
                      "description": "The ID of the room associated with this event. Will not be present on events\nthat arrive through `/sync`, despite being required everywhere else.",
                      "type": "string",
                      "format": "mx-room-id",
                      "pattern": "^!"
                    }
                  },
                  "required": [
                    "room_id"
                  ]
                }
              ]
            },
            {
              "title": "SyncStateEvent",
              "description": "In addition to the Room Event fields, State Events have the following additional fields.",
              "allOf": [
                {
                  "title": "SyncRoomEvent",
                  "description": "In addition to the Event fields, Room Events have the following additional fields.",
                  "allOf": [
                    {
                      "description": "The basic set of fields all events must have.",
                      "properties": {
                        "content": {
                          "description": "The fields in this object will vary depending on the type of event. When interacting with the REST API, this is the HTTP body.",
                          "type": "object"
                        },
                        "type": {
                          "description": "The type of event, as defined by [the event type specification](/client-server-api/#types-of-room-events).",
                          "type": "string"
                        }
                      },
                      "required": [
                        "type",
                        "content"
                      ],
                      "title": "Event",
                      "type": "object"
                    },
                    {
                      "type": "object",
                      "properties": {
                        "event_id": {
                          "description": "The globally unique event identifier.",
                          "type": "string",
                          "format": "mx-event-id",
                          "pattern": "^\\$"
                        },
                        "sender": {
                          "description": "Contains the fully-qualified ID of the user who sent this event.",
                          "type": "string",
                          "format": "mx-user-id",
                          "pattern": "^@"
                        },
                        "origin_server_ts": {
                          "description": "Timestamp in milliseconds on originating homeserver when this event was sent.",
                          "type": "integer",
                          "format": "int64"
                        },
                        "unsigned": {
                          "title": "UnsignedData",
                          "type": "object",
                          "description": "Contains optional extra information about the event.",
                          "properties": {
                            "age": {
                              "description": "The time in milliseconds that has elapsed since the event was sent.",
                              "type": "integer"
                            }
                          }
                        }
                      },
                      "required": [
                        "event_id",
                        "sender",
                        "origin_server_ts"
                      ]
                    }
                  ]
                },
                {
                  "type": "object",
                  "properties": {
                    "state_key": {
                      "description": "A unique key which defines the overwriting semantics for this piece of room state. This value is often a zero-length string. The presence of this key makes this event a State Event.\nState keys starting with an `@` are reserved for referencing user IDs, such as room members. With the exception of a few events, state events set with a given user's ID as the state key MUST only be set by that user.",
                      "type": "string"
                    }
                  },
                  "required": [
                    "state_key"
                  ]
                }
              ]
            }
          ],
          "description": "State Events have the following fields.",
          "title": "StateEvent",
          "type": "object"
        }
      ],
      "description": "Adjusts the membership state for a user in a room. It is preferable to use the membership APIs\n(`/rooms/<room id>/invite` etc) when performing membership actions rather than adjusting the\nstate directly as there are a restricted set of valid transformations. For example, user A cannot\nforce user B to join a room, and trying to force this state change directly will fail.\n\nThe following membership states are specified:\n\n- `invite` - The user has been invited to join a room, but has not yet joined it. They may not\n  participate in the room until they join.\n- `join` - The user has joined the room (possibly after accepting an invite), and may participate\n  in it.\n- `leave` - The user was once joined to the room, but has since left (possibly by choice, or\n  possibly by being kicked).\n- `ban` - The user has been banned from the room, and is no longer allowed to join it until they\n  are un-banned from the room (by having their membership state set to a value other than `ban`).\n- `knock` - The user has knocked on the room, requesting permission to participate. They may not\n  participate in the room until they join.\n\nThe `third_party_invite` property will be set if this invite is an `invite` event and is the\nsuccessor of an [`m.room.third_party_invite`](/client-server-api/#mroomthird_party_invite) event,\nand absent otherwise.\n\nThis event may also include an `invite_room_state` key inside the event's `unsigned` data.\nIf present, this contains an array of [stripped state events](/client-server-api/#stripped-state)\nto assist the receiver in identifying the room.\n\nThe user for which a membership applies is represented by the `state_key`. Under some conditions,\nthe `sender` and `state_key` may not match - this may be interpreted as the `sender` affecting\nthe membership state of the `state_key` user.\n\nThe `membership` for a given user can change over time. The table below represents the various changes\nover time and how clients and servers must interpret those changes. Previous membership can be retrieved\nfrom the `prev_content` object on an event. If not present, the user's previous membership must be assumed\nas `leave`.\n\n|                   | to `invite`          | to `join`                              | to `leave`                                                                                                                              | to `ban`                    | to `knock`           |\n|-------------------|----------------------|----------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------|-----------------------------|----------------------|\n| **from `invite`** | No change.           | User joined the room.                  | If the `state_key` is the same as the `sender`, the user rejected the invite. Otherwise, the `state_key` user had their invite revoked. | User was banned.            | User is re-knocking. |\n| **from `join`**   | Must never happen.   | `displayname` or `avatar_url` changed. | If the `state_key` is the same as the `sender`, the user left. Otherwise, the `state_key` user was kicked.                              | User was kicked and banned. | Must never happen.   |\n| **from `leave`**  | New invitation sent. | User joined.                           | No change.                                                                                                                              | User was banned.            | User is knocking.    |\n| **from `ban`**    | Must never happen.   | Must never happen.                     | User was unbanned.                                                                                                                      | No change.                  | Must never happen.   |\n| **from `knock`**  | Knock accepted.      | Must never happen.                     | If the `state_key` is the same as the `sender`, the user retracted the knock. Otherwise, the `state_key` user had their knock denied.   | User was banned.            | No change.           |",
      "properties": {
        "content": {
          "properties": {
            "avatar_url": {
              "description": "The avatar URL for this user, if any.",
              "type": "string",
              "format": "uri"
            },
            "displayname": {
              "description": "The display name for this user, if any.",
              "type": [
                "string",
                "null"
              ]
            },
            "membership": {
              "description": "The membership state of the user.",
              "enum": [
                "invite",
                "join",
                "knock",
                "leave",
                "ban"
              ],
              "type": "string"
            },
            "is_direct": {
              "description": "Flag indicating if the room containing this event was created with the intention of being\na direct chat. See [Direct Messaging](/client-server-api/#direct-messaging).",
              "type": "boolean"
            },
            "join_authorised_via_users_server": {
              "x-addedInMatrixVersion": "1.2",
              "type": "string",
              "format": "mx-user-id",
              "pattern": "^@",
              "description": "Usually found on `join` events, this field is used to denote which homeserver (through\nrepresentation of a user with sufficient power level) authorised the user's join. More\ninformation about this field can be found in the [Restricted Rooms Specification](/client-server-api/#restricted-rooms).\n\nClient and server implementations should be aware of the [signing implications](/rooms/v8/#authorisation-rules)\nof including this field in further events: in particular, the event must be signed by the\nserver which owns the user ID in the field. When copying the membership event's `content`\n(for profile updates and similar) it is therefore encouraged to exclude this field in the\ncopy, as otherwise the event might fail event authorisation."
            },
            "reason": {
              "x-addedInMatrixVersion": "1.1",
              "type": "string",
              "description": "Optional user-supplied text for why their membership has changed. For kicks and bans,\nthis is typically the reason for the kick or ban. For other membership changes, this is a\nway for the user to communicate their intent without having to send a message to the\nroom, such as in a case where Bob rejects an invite from Alice about an upcoming concert,\nbut can't make it that day.\n\nClients are not recommended to show this reason to users when receiving an invite due to\nthe potential for spam and abuse. Hiding the reason behind a button or other component is\nrecommended."
            },
            "third_party_invite": {
              "title": "ThirdPartyInvite",
              "description": "A third-party invite, if this `m.room.member` is the successor to an\n[`m.room.third_party_invite`](/client-server-api/#mroomthird_party_invite)\nevent.",
              "type": "object",
              "properties": {
                "display_name": {
                  "description": "A name which can be displayed to represent the user instead of their\nthird-party identifier",
                  "type": "string"
                },
                "signed": {
                  "title": "SignedThirdPartyInvite",
                  "description": "A block of content which has been signed by the identity server, which\nhomeservers can use to verify the event. Clients should ignore this.",
                  "type": "object",
                  "properties": {
                    "mxid": {
                      "description": "The user ID that has been bound to the third-party identifier.",
                      "type": "string",
                      "format": "mx-user-id",
                      "pattern": "^@",
                      "example": "@alice:example.org"
                    },
                    "signatures": {
                      "title": "IdentityServerSignatures",
                      "description": "The identity server signatures for this block. This is a map of identity\nserver name to signing key identifier to base64-encoded signature.\n\nThe signatures are calculated using the process described at\n[Signing JSON](/appendices/#signing-json).",
                      "type": "object",
                      "patternProperties": {
                        "": {
                          "x-pattern-format": "mx-server-name",
                          "type": "object",
                          "additionalProperties": {
                            "type": "string",
                            "format": "mx-unpadded-base64"
                          }
                        }
                      },
                      "example": {
                        "magic.forest": {
                          "ed25519:3": "fQpGIW1Snz+pwLZu6sTy2aHy/DYWWTspTJRPyNp0PKkymfIsNffysMl6ObMMFdIJhk6g6pwlIqZ54rxo8SLmAg"
                        }
                      }
                    },
                    "token": {
                      "description": "The token generated by the identity server at the\n[`/store_invite`](/identity-service-api/#post_matrixidentityv2store-invite)\nendpoint.\n\nIt matches the `state_key` of the corresponding [`m.room.third_party_invite`](/client-server-api/#mroomthird_party_invite)\nevent.",
                      "type": "string",
                      "example": "abc123"
                    }
                  },
                  "required": [
                    "mxid",
                    "signatures",
                    "token"
                  ]
                }
              },
              "required": [
                "display_name",
                "signed"
              ]
            }
          },
          "required": [
            "membership"
          ],
          "title": "EventContent",
          "type": "object"
        },
        "state_key": {
          "description": "The `user_id` this membership event relates to. In all cases except for when `membership` is\n`join`, the user ID sending the event does not need to match the user ID in the `state_key`,\nunlike other events. Regular authorisation rules still apply.",
          "type": "string",
          "format": "mx-user-id",
          "pattern": "^@"
        },
        "type": {
          "enum": [
            "m.room.member"
          ],
          "type": "string"
        },
        "unsigned": {
          "allOf": [
            {
              "title": "UnsignedData",
              "type": "object",
              "description": "Contains optional extra information about the event.",
              "properties": {
                "age": {
                  "description": "The time in milliseconds that has elapsed since the event was sent.",
                  "type": "integer"
                }
              }
            },
            {
              "type": "object",
              "properties": {
                "invite_room_state": {
                  "x-changedInMatrixVersion": {
                    "1.16": "`m.room.create` was made a required event type for stripped state.\n"
                  },
                  "description": "A subset of the state of the room at the time of the invite, if `membership` is `invite`.\nNote that this state is informational, and SHOULD NOT be trusted; once the client has\njoined the room, it SHOULD fetch the live state from the server and discard the\ninvite_room_state. Also, clients must not rely on any particular state being present here;\nthey SHOULD behave properly (with possibly a degraded but not a broken experience) in\nthe absence of any particular events here. If they are set on the room, at least the\nstate for `m.room.avatar`, `m.room.canonical_alias`, `m.room.join_rules`, and `m.room.name`\nSHOULD be included. The `m.room.create` event MUST be included, though MAY be missing if\nthe server hasn't updated to support the Matrix 1.16 specification.",
                  "items": {
                    "title": "StrippedStateEvent",
                    "type": "object",
                    "description": "A stripped down state event, with only the `type`, `state_key`,\n`sender`, and `content` keys.",
                    "properties": {
                      "content": {
                        "description": "The `content` for the event.",
                        "title": "EventContent",
                        "type": "object"
                      },
                      "state_key": {
                        "description": "The `state_key` for the event.",
                        "type": "string"
                      },
                      "type": {
                        "description": "The `type` for the event.",
                        "type": "string"
                      },
                      "sender": {
                        "description": "The `sender` for the event.",
                        "type": "string",
                        "format": "mx-user-id",
                        "pattern": "^@"
                      }
                    },
                    "required": [
                      "type",
                      "state_key",
                      "content",
                      "sender"
                    ]
                  },
                  "type": "array"
                },
                "knock_room_state": {
                  "x-changedInMatrixVersion": {
                    "1.16": "`m.room.create` was made a required event type for stripped state.\n"
                  },
                  "description": "A subset of the state of the room at the time of the knock, if `membership` is `knock`.\nThis has the same restrictions as `invite_room_state`. If they are set on the room, at least\nthe state for `m.room.avatar`, `m.room.canonical_alias`, `m.room.join_rules`, `m.room.name`,\nand `m.room.encryption` SHOULD be included. The `m.room.create` event MUST be included,\nthough MAY be missing if the server hasn't updated to support the Matrix 1.16 specification.",
                  "items": {
                    "title": "StrippedStateEvent",
                    "type": "object",
                    "description": "A stripped down state event, with only the `type`, `state_key`,\n`sender`, and `content` keys.",
                    "properties": {
                      "content": {
                        "description": "The `content` for the event.",
                        "title": "EventContent",
                        "type": "object"
                      },
                      "state_key": {
                        "description": "The `state_key` for the event.",
                        "type": "string"
                      },
                      "type": {
                        "description": "The `type` for the event.",
                        "type": "string"
                      },
                      "sender": {
                        "description": "The `sender` for the event.",
                        "type": "string",
                        "format": "mx-user-id",
                        "pattern": "^@"
                      }
                    },
                    "required": [
                      "type",
                      "state_key",
                      "content",
                      "sender"
                    ]
                  },
                  "type": "array"
                }
              }
            }
          ]
        }
      },
      "title": "The current membership state of a user in the room.",
      "type": "object"
    },
    "Mentions": {
      "type": "object",
      "title": "m.mentions",
      "description": "Describes whether the event mentions other users or the room. This is contained\nwithin the event's `content` alongside other fields for the relevant event type.",
      "example": {
        "user_ids": [
          "@alice:example.org"
        ]
      },
      "properties": {
        "user_ids": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "A list of Matrix IDs of mentioned users."
        },
        "room": {
          "type": "boolean",
          "description": "A boolean set to `true` to mention the room, for an `@room` notification.\n(`room` should otherwise not be included on the event.)"
        }
      }
    }
  }
} as const;
