import * as HashidsObject from 'hashids';

export namespace Environment {
  /**
   * Enumeration of all supported deployment environments.
   */
  export enum DeploymentEnv {
    Development = 'development',
    Testing = 'testing',
    Staging = 'staging',
    Production = 'production',
  }

  /**
   * Reads the 'NODE_ENV' environment variable to determine what the current
   * deployment environment is.
   *
   * Certain features may be disabled under certain environments by using the
   * value returned by this function.
   *
   * If no environment is specified, it will be set to 'development'.
   */
  export function getDeploymentEnv(): DeploymentEnv {
    const env: string = (process.env.NODE_ENV || '').toLowerCase();

    if (env === '') {
      return DeploymentEnv.Development;
    }

    if (env === DeploymentEnv.Development) {
      return DeploymentEnv.Development;
    } else if (env === DeploymentEnv.Testing) {
      return DeploymentEnv.Testing;
    } else if (env === DeploymentEnv.Staging) {
      return DeploymentEnv.Staging;
    } else if (env === DeploymentEnv.Production) {
      return DeploymentEnv.Production;
    }

    throw new Error(`Unsupported NODE_ENV specified.`);
  }
}

export namespace Hashids {
  /**
   * A builder method to get a pre-built hashids object so we don't have to
   * inject the config manully each time it's invoked.
   */
  export function build(config: any): HashidsObject.default {
    // The hashids typescript definition file has errors that make it transpile
    // to javascript incorrectly, even if the type system is happy. Do some
    // black magic to make the type system happy and actually use the right
    // constructor.
    const hashids: HashidsObject.default = new (HashidsObject as any)(
      config.hashids.salt, config.hashids.minLength);
    return hashids;
  }
}
