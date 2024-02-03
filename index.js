const express = require('express');
const app = express();
const axios = require('axios');

const port = process.env.PORT | 3000;

process.on('unCaughtException', (err) => {
    console.log("UnhandledPromiseReject! shuting the server", err.name, err.message);
    process.exit(1);
})

const asyncFuncHandler = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(err => next(err))
    }
}

app.get('/', asyncFuncHandler(async(req, res, next) => {
    const data = await axios.get('https://jsonplaceholder.typicode.com/posts');
    console.log("data?.data", data);
    if (!data?.data) {
        const err = new CustomError('No data found', 404);
        return next(err);
    }
    return res.send({ status: 'success', data: data?.data });
}))

class CustomError extends Error {
    constructor(message, statusCode) {
        super(message)
        this.statusCode = statusCode;
        this.status = statusCode >= 400 && statusCode < 500 ? 'failed' : 'error'
        this.isOperational = true
        Error.captureStackTrace(this, this.constructor)
    }
}

app.all('*', (req, res, next) => {
    const err = new CustomError(`can't find ${req.originalUrl} on the server`, 404);
    next(err)
})

app.use((err,req, res, next) => {
    // console.log("err", err);
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';


    if (process.env.NODE_ENV === 'development') {
        res.status(err.statusCode).send({
            status: err.status,
            message: err.message,
            stackTrace: err.stack,
            error: err
        })
    } else if (process.env.NODE_ENV === 'production') {
        if(err.isOperational) {
            res.status(err.statusCode).send({
                status: err.status,
                message: err.message
            })
        } else {
            res.status(500).send({
                status: 'error',
                message: 'Something went wrong! please try anain later'
            })
        }
    }
})



const server = app.listen(port, () => {
    console.log(`server is running on ${port}`);
})

process.on('unhandledRejection', (err) => {
    console.log("UnhandledPromiseReject! shuting the server", err.name, err.message);
    server.close(() => {
        process.exit(1)
    });
});