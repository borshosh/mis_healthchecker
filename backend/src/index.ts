import { createApp } from './app';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

createApp().listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
