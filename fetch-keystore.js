// One-off helper: downloads the Android production keystore for
// groomlink-customer from EAS and writes upload-cert.pem for the
// Google Play "reset upload key" flow. Run with EXPO_TOKEN set.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const APP_ID = 'c5932eab-b337-4f87-846e-f3dc5ed0b5cf';
const KEYTOOL = 'C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.11.10-hotspot\\bin\\keytool.exe';
const OUT_DIR = path.join(__dirname, 'apps', 'customer-app');

async function main() {
  const token = process.env.EXPO_TOKEN;
  if (!token) throw new Error('EXPO_TOKEN not set');

  const query = `query {
    app {
      byId(appId: "${APP_ID}") {
        androidAppCredentials {
          applicationIdentifier
          androidAppBuildCredentialsList {
            name
            isDefault
            androidKeystore {
              id
              keystore
              keystorePassword
              keyAlias
              keyPassword
            }
          }
        }
      }
    }
  }`;

  const res = await fetch('https://api.expo.dev/graphql', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  const credsList = json?.data?.app?.byId?.androidAppCredentials?.[0]?.androidAppBuildCredentialsList;
  const buildCreds = credsList?.find((c) => c.isDefault) ?? credsList?.[0];
  const ks = buildCreds?.androidKeystore;
  if (!ks) {
    console.error('No keystore returned:', JSON.stringify(json, null, 2));
    process.exit(1);
  }
  console.log('Build credentials :', buildCreds.name, buildCreds.isDefault ? '(default)' : '');

  const jksPath = path.join(OUT_DIR, 'groomlink-customer-upload.jks');
  fs.writeFileSync(jksPath, Buffer.from(ks.keystore, 'base64'));

  // Keep secrets out of the console — write them to a gitignored file.
  const credsPath = path.join(OUT_DIR, 'keystore-credentials.txt');
  fs.writeFileSync(
    credsPath,
    [
      `keystore: ${jksPath}`,
      `alias: ${ks.keyAlias}`,
      `keystorePassword: ${ks.keystorePassword}`,
      `keyPassword: ${ks.keyPassword}`,
      '',
    ].join('\n'),
    { mode: 0o600 }
  );

  const pemPath = path.join(OUT_DIR, 'upload-cert.pem');
  execFileSync(KEYTOOL, [
    '-exportcert',
    '-rfc',
    '-keystore', jksPath,
    '-alias', ks.keyAlias,
    '-storepass', ks.keystorePassword,
    '-file', pemPath,
  ]);

  console.log('Keystore saved :', jksPath);
  console.log('Credentials file:', credsPath, '(gitignored *.jks sidecar — keep safe, never commit)');
  console.log('Upload cert PEM :', pemPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
