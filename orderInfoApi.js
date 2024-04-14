const express = require('express');
const Redis = require('ioredis');
const router = express.Router();
const redis = new Redis();

router.post('/', (req, res) => {
    const { MsgType, OperationType, ClientId, Token, TenantId, OrderId, OMSId } = req.body;
    const key = `${TenantId}_${OMSId}_${ClientId}_${Token}:${OrderId}`;
    const body = req.body;

    if (!OperationType || !MsgType || !ClientId) {
        return res.status(400).json({ error: 'OperationType, ClientId, and MsgType are required' });
    }

    if (MsgType !== 1120) {
        return res.status(400).json({ error: 'Message type is not valid for order info' });
    }

    const fieldValues = Object.entries(body).flat();

    switch (OperationType) {
        case 100:
            if (!OrderId || !TenantId || !OMSId || !ClientId) {
                return res.status(400).json({ error: 'OrderId, TenantId, OMSId, and ClientId are required' });
            }
            redis.exists(`${TenantId}_${OMSId}:${ClientId}`, (err, exists) => {
                if (err) {
                    console.error('Redis error:', err);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                if (!exists) {
                    return res.status(400).json({ error: 'User not found to place order' });
                } else {
                    redis.hmset(key, fieldValues, (err, result) => {
                        if (err) {
                            console.error('Redis error:', err);
                            return res.status(500).json({ error: 'Internal server error' });
                        }
                        res.status(201).json({ message: 'Order added successfully', result });
                    });
                }
            });
            break;

        case 101:
        case 102:
            if (!OrderId) {
                return res.status(400).json({ error: 'OrderId is required' });
            }
            const action = OperationType === 101 ? 'edited' : 'deleted';
            redis[OperationType === 101 ? 'hmset' : 'del'](key, fieldValues, (err, result) => {
                if (err) {
                    console.error('Redis error:', err);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                if (result === 0 && OperationType === 102) {
                    return res.status(404).json({ error: 'Order data not found' });
                }
                res.status(200).json({ message: `Order ${action} successfully`, result });
            });
            break;

        case 103:
            if (!OrderId) {
                return res.status(400).json({ error: 'OrderId is required' });
            }
            redis.hgetall(key, (err, orderData) => {
                if (err) {
                    console.error('Redis error:', err);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                if (!orderData) {
                    return res.status(404).json({ error: 'Order data not found' });
                }
                res.json(orderData);
            });
            break;

        case 104:
            redis.keys(`${TenantId}_${OMSId}_*`, (err, keys) => {
                if (err) {
                    console.error('Redis error:', err);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                if (!keys || keys.length === 0) {
                    return res.status(404).json({ error: 'No records found' });
                }
                const getAllDataPromises = keys.map(key => {
                    return new Promise((resolve, reject) => {
                        redis.hgetall(key, (err, data) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(data);
                            }
                        });
                    });
                });
                Promise.all(getAllDataPromises)
                    .then(results => {
                        res.json(results);
                    })
                    .catch(err => {
                        console.error('Redis error:', err);
                        res.status(500).json({ error: 'Internal server error' });
                    });
            });
            break;

        default:
            return res.status(400).json({ error: 'Invalid OpeType' });
    }
});

module.exports = router;