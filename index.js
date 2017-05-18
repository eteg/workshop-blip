import * as  MessagingHub from 'messaginghub-client';
import WebSocketTransport from 'lime-transport-websocket';
import {IDENTIFIER, ACCESS_KEY} from './blipAuth';

const client = new MessagingHub.ClientBuilder()
  .withIdentifier(IDENTIFIER)
  .withAccessKey(ACCESS_KEY)
  .withTransportFactory(() => new WebSocketTransport())
  .build();

client
  .connect()
  .then(() => {
    console.log('connected');
    client.addMessageReceiver(true, receiver1);
    client.addMessageReceiver(true, receiver2);
  });

function receiver1(message) {
  console.log(message);
}

function receiver2(message) {
  const msg = { id: '1', type: 'text/plain', content: 'Hello, world', to: message.from };
  client.sendMessage(msg);
}