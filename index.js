const express = require('express');
const bodyParser = require('body-parser')
const querystring = require('querystring')
const crypto = require('crypto')
const path = require('path')
const app = express();

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

const ShopBasePaymentKey = 'c0d1160f379a712ff66c91f605e04a13'

function getSignature(obj) {
    const objEntities = Object.entries(obj);
    const msg = objEntities.filter(([key, val]) => key.startsWith('x_') && val !== undefined).sort(([key], [key2]) => {
        if (key < key2) {
            return -1;
        }
        if (key > key2) {
            return 1;
        }
        return 0;
    }).reduce(((previousValue, [key, val]) => {
        if (typeof val === 'object') {
            return `${previousValue}${key}${JSON.stringify(val)}`;
        }
        return `${previousValue}${key}${val}`;
    }), '');

    return crypto.createHmac('sha256', ShopBasePaymentKey).update(msg).digest('hex');
}

// for testing
const database = {}

app.get('/form', (req, res) => {
    res.sendFile(path.join(__dirname + '/index.html'));
})

app.post('/create-order-iframe', (req, res) => {
    const order = {
        x_account_id: req.body['x_account_id'],
        x_amount: parseFloat(req.body['x_amount']),
        x_currency: req.body['x_currency'],
        x_gateway_reference: Date.now().toString(), // random number for testing
        x_reference: req.body['x_reference'],
        x_transaction_type: 'authorization',
        x_test: false,
        x_timestamp: new Date().toISOString(),
        // x_message: res.errorMessage,
        // x_error_code: res.errorCode,
        x_result: 'completed',
    }
    database[order['x_gateway_reference'] + 'authorization'] = order
    res.json({
        x_signature: getSignature(order),
        ...order,
    })
})

app.post('/update-authorization',(req,res) => {
    const transaction = database[req.body['x_gateway_reference'] + 'authorization']

    transaction['x_amount'] = transaction['x_amount'] + parseFloat(req.body['x_amount'])

    res.header('X-Signature', getSignature(transaction)).status(200).json(transaction)
})


app.post('/create-order-api', (req, res) => {

    // create order

    const order = {
        x_account_id: req.body['x_account_id'],
        x_amount: parseFloat(req.body['x_amount']),
        x_currency: req.body['x_currency'],
        x_gateway_reference: Date.now().toString(), // random number for testing
        x_reference: req.body['x_reference'],
        x_transaction_type: 'authorization',
        x_test: false,
        x_timestamp: new Date().toISOString(),
        // x_message: res.errorMessage,
        // x_error_code: res.errorCode,
        x_result: 'completed',
    }

    database[order['x_gateway_reference'] + 'authorization'] = order


    res.redirect(`${req.body.x_url_complete}?${querystring.stringify({
        x_signature: getSignature(order),
        ...order,
    })}`)
})

app.post('/refund', (req, res) => {

    //refund in gateway and get transaction refund

    const refundTransaction = {
        x_account_id: req.body['x_account_id'],
        x_amount: parseFloat(req.body['x_amount']),
        x_currency: req.body['x_currency'],
        x_gateway_reference: Date.now().toString(), // random number for testing
        x_reference: req.body['x_reference'],
        x_transaction_type: 'refund',
        x_test: false,
        x_timestamp: new Date().toISOString(),
        // x_message: "some thing went wrong",
        // x_error_code: 'ACCOUNT_RESTRICTED',
        x_result: 'completed',
    }


    database[req.body.x_gateway_reference + refundTransaction.x_transaction_type] = refundTransaction

    res.header('X-Signature', getSignature(refundTransaction)).status(200).json(refundTransaction)
})

app.post('/void', (req, res) => {
    console.log(req.body);
    // todo
})


app.get('/get-transaction', (req, res) => {

    const transaction = database[req.query.x_gateway_reference + req.query.x_transaction_type]


    res.header('X-Signature', getSignature(transaction)).status(200).json(transaction)
})

app.post('/capture', (req, res) => {

    //capture transaction

    const capturedTransaction = {
        x_account_id: req.body['x_account_id'],
        x_amount: parseFloat(req.body['x_amount']),
        x_currency: req.body['x_currency'],
        x_gateway_reference: Date.now().toString(), // random number for testing
        x_reference: req.body['x_reference'],
        x_transaction_type: 'capture',
        x_test: false,
        x_timestamp: new Date().toISOString(),
        // x_message: res.errorMessage,
        // x_error_code: res.errorCode,
        x_result: 'completed',
    }

    database[req.body.x_gateway_reference + capturedTransaction.x_transaction_type] = capturedTransaction

    res.header('X-Signature', getSignature(capturedTransaction)).status(200).json(capturedTransaction)
})


app.post('/validate-credential', (req, res) => {
    console.log(req.body);
    res.json({x_result: 'valid'})
})

app.listen('8080', () => {
    console.log("application running port 8080")
})