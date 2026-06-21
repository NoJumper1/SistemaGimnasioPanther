require('dotenv').config();
const app     = require('./app');
const { seed } = require('./db/seed');
const spotify = require('./services/spotify');

seed();
spotify.start();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor del gimnasio corriendo en http://localhost:${PORT}`);
});
