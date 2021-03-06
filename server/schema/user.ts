import {
  GraphQLFieldConfig,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
  GraphQLError,
} from 'graphql';

import {
  connectionArgs,
  connectionDefinitions,
  mutationWithClientMutationId,
} from 'graphql-relay';

import * as argon2 from 'argon2';
import * as config from '../config';
import * as knex from '../database';
import * as validator from 'validator';
import fetch from './fetch';
import joinMonster from 'join-monster';
import { Hashids } from '../utils';
import { JWTToken } from './jwt-token';
import { Post, PostConnection } from './post';
import { UserError, ValidationError } from '../errors';
import { getLocaleString } from '../localization';
import { parseFullName } from 'parse-full-name';

// tslint:disable-next-line
const GraphQLHashId = Hashids.getGraphQLHashId();

const joinMonsterOptions = { dialect: config.knex.client };

// tslint:disable-next-line
const User = new GraphQLObjectType({
  description: '',
  name: 'User',
  sqlTable: 'users',
  uniqueKey: 'id',

  fields: () => ({
    id: {
      description: 'The id hashid encoded.',
      sqlColumn: 'id',
      type: GraphQLHashId,

      resolve: (user: any) => user.id,
    },
    email: {
      sqlColumn: 'email',
      type: GraphQLString,

      resolve: (user: any) => `${user.email}`,
    },
    fullName: {
      description: `A user's full name.`,
      sqlColumn: 'full_name',
      type: GraphQLString,

      resolve: (user: any) => `${user.fullName}`,
    },
    firstName: {
      description: `A user's first name.`,
      sqlColumn: 'first_name',
      type: GraphQLString,

      resolve: (user: any) => `${user.firstName}`,
    },
    lastName: {
      description: `A user's last name.`,
      sqlColumn: 'last_name',
      type: GraphQLString,

      resolve: (user: any) => `${user.lastName}`,
    },
    posts: {
      description: 'A list of posts the user has written.',
      type: PostConnection,
      args: connectionArgs,
      sqlPaginate: true,

      sortKey: {
        order: 'DESC',
        key: 'id',
      },

      sqlJoin: (users: string, posts: string) => {
        return `
          ${users}.id = ${posts}.owner_id AND
          ${users}.deleted_at IS NULL`;
      },
    },
  }),
} as any);

// tslint:disable-next-line
const RegisterUser = mutationWithClientMutationId({
  name: 'RegisterUser',

  inputFields: {
    email: {
      type: new GraphQLNonNull(GraphQLString),
      description: `The user's email address.`,
    },
    fullName: {
      type: new GraphQLNonNull(GraphQLString),
      description: `The user's full name.`,
    },
    password: {
      type: new GraphQLNonNull(GraphQLString),
      description: `The user's unhashed password (hashed in storage).`,
    },
  },

  outputFields: {
    user: {
      type: User,

      resolve: (payload, args, context, resolveInfo) => {
        const dbCall = (sql: string) => {
          return fetch(sql, { id: payload.userId }, context);
        };
        return joinMonster(resolveInfo, context, dbCall, joinMonsterOptions);
      },
    },

    jwtToken: {
      type: JWTToken,

      resolve: (payload, args, context, resolveInfo) => {
        return payload;
      },
    },
  },

  mutateAndGetPayload: async (args, context, resolveInfo): Promise<any> => {
    if (!validator.isLength(args.email, { min: 6, max: 190 })) {
      throw new ValidationError(getLocaleString('InvalidEmailLength', context, {
        min: 6,
        max: 190,
      }));
    }
    if (!validator.isEmail(args.email)) {
      throw new ValidationError(getLocaleString('InvalidEmail', context));
    }

    if (!validator.isLength(args.fullName, { min: 4, max: 190 })) {
      throw new ValidationError(getLocaleString('InvalidNameLength', context, {
        min: 4,
        max: 190,
      }));
    }
    const fullName = parseFullName(args.fullName);

    // No funky special character nonsense. Upper bound on password prevents
    // DoS: http://permalink.gmane.org/gmane.comp.python.django.devel/39831
    if (!validator.isLength(args.password, { min: 8, max: 190 })) {
      throw new ValidationError(getLocaleString('InvalidPasswordLength', context, {
        min: 8,
        max: 4096,
      }));
    }
    const hashedPassword = await argon2.hash(args.password, {
      type: argon2.argon2id,
    });

    const data = {
      email: args.email,
      full_name: args.fullName,
      first_name: fullName.first,
      last_name: fullName.last,
      password: hashedPassword,
    };

    return await knex.transaction(async (tx) => {
      // Check email using an extra SELECT to avoid incrementing the SERIAL
      // sequence with repeated failed attempts.
      const emailResults = await knex('users')
        .select(knex.raw(1))
        .where({ email: args.email, deleted_at: null });
      if (emailResults.length > 0) {
        throw new ValidationError(getLocaleString('EmailClaimedError', context));
      }

      // Register the account and return the id so join monster can query the
      // new account details and deliver them to the client.
      const id = await knex('users').insert(data).returning('id');

      return { userId: id[0] };
    });
  },
});

// tslint:disable-next-line
const AuthenticateUser = mutationWithClientMutationId({
  name: 'AuthenticateUser',

  inputFields: {
    email: {
      type: new GraphQLNonNull(GraphQLString),
      description: `The user's email address.`,
    },
    password: {
      type: new GraphQLNonNull(GraphQLString),
      description: `The user's unhashed password (hashed in storage).`,
    },
  },

  outputFields: {
    user: {
      type: User,

      resolve: (payload, args, context, resolveInfo) => {
        const dbCall = (sql: string) => {
          return fetch(sql, { id: payload.userId }, context);
        };
        return joinMonster(resolveInfo, context, dbCall, joinMonsterOptions);
      },
    },

    jwtToken: {
      type: JWTToken,

      resolve: (payload, args, context, resolveInfo) => {
        return payload;
      },
    },
  },

  mutateAndGetPayload: async (args, context, resolveInfo): Promise<any> => {
    if (!validator.isLength(args.email, { min: 6, max: 190 })) {
      throw new ValidationError(getLocaleString('InvalidEmailLength', context, {
        min: 6,
        max: 190,
      }));
    }
    if (!validator.isEmail(args.email)) {
      throw new ValidationError(getLocaleString('InvalidEmail', context));
    }

    // No funky special character nonsense. Upper bound on password prevents
    // DoS: http://permalink.gmane.org/gmane.comp.python.django.devel/39831
    if (!validator.isLength(args.password, { min: 8, max: 190 })) {
      throw new ValidationError(getLocaleString('InvalidPasswordLength', context, {
        min: 8,
        max: 4096,
      }));
    }

    return await knex.transaction(async (tx) => {
      // Check email using an extra SELECT to avoid incrementing the SERIAL
      // sequence with repeated failed attempts.
      const emailResults = await knex('users')
        .select('id', 'password')
        .where({ email: args.email, deleted_at: null });
      if (emailResults.length <= 0) {
        throw new ValidationError(getLocaleString('InvalidAuthorizationInfo', context));
      }

      const user = emailResults[0];
      const verified = await argon2.verify(user.password, args.password);
      if (!verified) {
        throw new ValidationError(getLocaleString('InvalidAuthorizationInfo', context));
      }

      return { userId: user.id };
    });
  },
});

// tslint:disable-next-line
const { connectionType: UserConnection } = connectionDefinitions({
  nodeType: User,
});

export { User, UserConnection, RegisterUser, AuthenticateUser };
