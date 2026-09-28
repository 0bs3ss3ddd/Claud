import { loadConfig } from './config.js';
import { createApp } from './app.js';

const config = loadConfig();

if (config.production && config.payments.demo) {
  console.warn('[warn] PAYMENTS_DEMO включён в production — тариф можно получить без оплаты!');
}

const { app, tutor, payments } = await createApp(config);

app.listen(config.port, config.host, () => {
  console.log(`${config.brand} запущена: ${config.publicUrl}`);
  console.log(`  наставник: ${tutor.aiEnabled ? `Claude API (${config.anthropic.model})` : 'демо-режим (нет ANTHROPIC_API_KEY)'}`);
  console.log(`  оплата:    ${payments.mode === 'yookassa' ? 'ЮKassa' : payments.mode === 'demo' ? 'демо (без денег)' : 'выключена'}`);
});
