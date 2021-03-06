/* tslint:disable:object-literal-key-quotes */

type TemplatedTranslation = (args: any) => string;

interface Translation {
  [locale: string]: string | TemplatedTranslation;
}

interface Translations {
  [string: string]: Translation;
}

/**
 * All human-readable strings and their translations are stored here.
 */
const translations: Translations = {
  'InternalError': {
    'en': `Unable to process request due to an internal error.`,
  },
  'EmailClaimedError': {
    'en': `Email is already in use by another account.`,
  },
  'InvalidEmail': {
    'en': `The specified email isn't a valid email address.`,
  },
  'InvalidEmailLength': {
    'en': (args: any) => `Email must be between ${args.min} and ${args.max} characters long.`,
  },
  'InvalidNameLength': {
    'en': (args: any) => `Name must be between ${args.min} and ${args.max} characters long.`,
  },
  'InvalidPasswordLength': {
    'en': (args: any) => `Password must be at least ${args.min} chatacters long.`,
  },
  'InvalidAuthorizationInfo': {
    'en': `Email or password is incorrect.`,
  },
};

/**
 * Fetches a string message for a desired string in a chosen language.
 * @param string
 * @param locale
 */
export function getLocaleString(string: string, context: any, args?: any): string {
  if (!(string in translations)) {
    throw new Error(`Unsupported translation string requested.`);
  }

  const locale = 'en';
  if (context != null) {
    // TODO: Handle different locales.
  }

  const candidates = translations[string];
  let actualLocale = locale;
  if (!(locale in candidates)) {
    actualLocale = 'en';
  }

  if (!(actualLocale in candidates)) {
    throw new Error(`No translations are available for the requested string.`);
  }

  const candidate = candidates[actualLocale];
  if (typeof candidate === 'string') {
    return candidate as string;
  } else {
    return candidate(args);
  }
}
