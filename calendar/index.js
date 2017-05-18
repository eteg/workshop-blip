import fs from 'fs';
import readline from 'readline';
import google from 'googleapis';
import googleAuth from 'google-auth-library';

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/calendar-nodejs-quickstart.json
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_DIR = `${(process.env.HOME || process.env.HOMEPATH ||
  process.env.USERPROFILE)}/.credentials/`;
const TOKEN_PATH = `${TOKEN_DIR}calendar-nodejs-quickstart.json`;

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log(`Token stored to ${TOKEN_PATH}`);
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oauth2Client.getToken(code, (err, token) => {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token; // eslint-disable-line no-param-reassign
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const clientSecret = credentials.installed.client_secret;
  const clientId = credentials.installed.client_id;
  const redirectUrl = credentials.installed.redirect_uris[0];
  const auth = new googleAuth(); // eslint-disable-line new-cap
  const oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

const functions = {};

functions.listEvents = () => (auth) => {
  const calendar = google.calendar('v3');
  calendar.events.list({
    auth,
    calendarId: 'primary',
    timeMin: (new Date()).toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  }, (err, response) => {
    if (err) {
      console.log(`The API returned an error: ${err}`);
      return;
    }
    const events = response.items;
    if (events.length === 0) {
      console.log('No upcoming events found.');
    } else {
      console.log('Upcoming 10 events:');
      for (let i = 0; i < events.length; i += 1) {
        const event = events[i];
        const start = event.start.dateTime || event.start.date;
        console.log('%s - %s', start, event.summary);
      }
    }
  });
};

functions.createEvent = event => (auth) => {
  const calendar = google.calendar('v3');
  calendar.events.insert({
    auth,
    calendarId: 'primary',
    resource: event,
  }, (err, createdEvent) => {
    if (err) {
      console.log(`There was an error contacting the Calendar service: ${err}`);
      return;
    }
    console.log('Event created: %s', createdEvent.htmlLink);
  });
};

export default {
  exec(func, params) {
    // Load client secrets from a local file.
    fs.readFile('./calendar/client_secret.json', (err, content) => {
      if (err) {
        console.log(`Error loading client secret file: ${err}`);
        return;
      }
      // Authorize a client with the loaded credentials, then call the
      // Google Calendar API.
      authorize(JSON.parse(content), functions[func](params));
    });
  },
};
