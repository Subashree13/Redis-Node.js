const express = require('express');
const bodyParser = require('body-parser');
const clientApi = require('./clientInfoApi');
const orderApi = require('./orderInfoApi');

const app = express();
const PORT = 1313;

app.use(bodyParser.json());

app.use('/api/client', clientApi);
app.use('/api/order', orderApi);

app.listen(PORT, () => {
    console.log(`Server is running == ${PORT}`);
});
