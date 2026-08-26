/**
 * Jest stub for expo-server-sdk.
 *
 * The real package ships ESM-only builds ("import ..." syntax), which Jest
 * cannot parse under ts-jest's CommonJS transform. Push notifications are not
 * under test in any suite, so this minimal stub stands in at runtime while
 * TypeScript still resolves real types from node_modules.
 */
class Expo {
  static isExpoPushToken() {
    return false;
  }

  chunkPushNotifications(messages) {
    return [messages];
  }

  async sendPushNotificationsAsync() {
    return [];
  }
}

module.exports = { Expo };
