import * as MessagingHub from 'messaginghub-client';
import WebSocketTransport from 'lime-transport-websocket';
import { IDENTIFIER, ACCESS_KEY } from './blipAuth';

import calendar from './calendar';

const client = new MessagingHub.ClientBuilder()
  .withIdentifier(IDENTIFIER)
  .withAccessKey(ACCESS_KEY)
  .withTransportFactory(() => new WebSocketTransport())
  .build();

function receiver1(message) {
  console.log(message);
}

function receiver2(message) {
  const msg = { id: '1', type: 'text/plain', content: `Você disse: ${message.content}`, to: message.from };
  client.sendMessage(msg);
}

client
  .connect()
  .then(() => {
    console.log('connected');
    client.addMessageReceiver(true, receiver1);
    client.addMessageReceiver(true, receiver2);
  });

calendar.exec('listEvents');
calendar.exec('createEvent', {
  'summary': 'Google I/O 2015',
  'location': '800 Howard St., San Francisco, CA 94103',
  'description': 'A chance to hear more about Google\'s developer products.',
  'start': {
    'dateTime': '2015-05-28T09:00:00-07:00',
    'timeZone': 'America/Los_Angeles',
  },
  'end': {
    'dateTime': '2015-05-28T17:00:00-07:00',
    'timeZone': 'America/Los_Angeles',
  },
  'recurrence': [
    'RRULE:FREQ=DAILY;COUNT=2'
  ],
  'attendees': [
    { 'email': 'lpage@example.com' },
    { 'email': 'sbrin@example.com' },
  ],
  'reminders': {
    'useDefault': false,
    'overrides': [
      { 'method': 'email', 'minutes': 24 * 60 },
      { 'method': 'popup', 'minutes': 10 },
    ],
  },
});