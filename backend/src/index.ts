import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

app.use(cors());

app.get('/', (_req, res) => {
  res.send('MIS Healthchecker backend is running');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
