import * as MessagingHub from 'messaginghub-client';
import WebSocketTransport from 'lime-transport-websocket';
import Lime from 'lime-js';
import { IDENTIFIER, ACCESS_KEY } from './blipAuth';

import calendar from './calendar';

const client = new MessagingHub.ClientBuilder()
  .withIdentifier(IDENTIFIER)
  .withAccessKey(ACCESS_KEY)
  .withTransportFactory(() => new WebSocketTransport(null, true))
  .build();

function setState(sessionState, from) {
  const command = {
    id: Lime.Guid(),
    method: 'set',
    uri: `/buckets/${encodeURIComponent(from.split('/')[0])}`,
    type: 'application/json',
    resource: {
      sessionState,
    },
  };

  // Grava a sessão do usuário no servidor
  client.sendCommand(command);
}

function logMsg(m) {
  console.log(m);
  // Passa a execução para o proximo receiver.
  return true;
}

function bye(m) {
  const command = {
    id: Lime.Guid(),
    method: 'delete',
    uri: `/buckets/${encodeURIComponent(m.from.split('/')[0])}`,
  };

  client.sendCommand(command);

  const message = {
    id: Lime.Guid(),
    type: 'text/plain',
    content: 'Volte sempre! :)',
    to: m.from,
  };

  client.sendMessage(message);
}

function welcome(m) {
  const params = m.from.split('@');
  const command = {
    id: Lime.Guid(),
    to: `postmaster@${params[1]}`,
    method: 'get',
    uri: `lime://${params[1]}/accounts/${encodeURIComponent(params[0])}`,
  };

  client.sendCommand(command)
    .then((userSession) => {
      const message = {
        id: Lime.Guid(),
        type: 'text/plain',
        content: `Bem vindo, ${userSession.resource.fullName.split(' ')[0]}`,
        to: m.from,
      };

      client.sendMessage(message, m.from);

      setState('choose_op', m.from);
    });
}

function states(m) {
  const command = {
    id: Lime.Guid(),
    method: 'get',
    uri: `/buckets/${encodeURIComponent(m.from.split('/')[0])}`,
  };

  client.sendCommand(command)
    .then((userSession) => {
      switch (userSession.resource.sessionState) {
        case 'choose_op': {
          const message = {
            id: Lime.Guid(),
            to: m.from,
            type: 'application/vnd.lime.select+json',
            content: {
              text: 'Escolha uma opção',
              options: [
                {
                  text: 'Ver eventos',
                },
                {
                  text: 'Agendar evento',
                },
                {
                  text: 'Cancelar evento',
                },
              ],
            },
          };
          client.sendMessage(message);
          break;
        }

        default:
          break;
      }
    });
}

client
  .connect()
  .then(() => {
    console.log('connected');

    // Toda mensagem que chegar vai ser logada no console
    client.addMessageReceiver(true, logMsg);

    // Limpa a sessão
    client.addMessageReceiver(
      m => m.type === 'text/plain' && m.content.toLowerCase().trim() === 'tchau',
      bye,
    );

    // Mensagem de bem vindo
    client.addMessageReceiver(
      m => m.type === 'text/plain' && m.content.toLowerCase().trim() === '#welcome',
      welcome,
    );

    // Trata os estados do bot
    client.addMessageReceiver(
      true,
      states);

    client.addMessageReceiver(m => m.type === 'text/plain' && m.content.toLowerCase().trim() === 'agendar evento',
      () => {
        calendar.exec('createEvent', {
          summary: 'Google I/O 2015',
          location: '800 Howard St., San Francisco, CA 94103',
          description: 'A chance to hear more about Google\'s developer products.',
          start: {
            dateTime: '2015-05-28T09:00:00-07:00',
            timeZone: 'America/Los_Angeles',
          },
          end: {
            dateTime: '2015-05-28T17:00:00-07:00',
            timeZone: 'America/Los_Angeles',
          },
          recurrence: [
            'RRULE:FREQ=DAILY;COUNT=2',
          ],
          attendees: [
            { email: 'lpage@example.com' },
            { email: 'sbrin@example.com' },
          ],
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 },
              { method: 'popup', minutes: 10 },
            ],
          },
        });
      });

    client.addMessageReceiver(m => m.type === 'text/plain' && m.content.toLowerCase().trim() === 'cancelar evento',
      (m) => {
        const message = {
          id: Lime.Guid(),
          type: 'text/plain',
          content: 'Volte mais tarde. Essa funcionalidade está sendo desenvolvida. :(',
          to: m.from,
        };

        client.sendMessage(message);
      });

    client.addMessageReceiver(m => m.type === 'text/plain' && m.content.toLowerCase().trim() === 'ver eventos',
      (m) => {
        calendar.exec('listEvents', (events) => {
          const message = {
            id: Lime.Guid(),
            type: 'text/plain',
            content: `Eventos na agenda:\n${events.join('\n')}`,
            to: m.from,
          };

          client.sendMessage(message);
        });
      });
  }).catch(() => {
    // TODO
  });
