const { response } = require('express')
const express = require('express')
const { send } = require('process')
const { v4: uuidv4 } = require('uuid')
const app = express()
const port = 7777
app.listen(port)
app.use(express.json())

const customers = []

// middleware
function cpfVerifyAccount(req, res, next) {
    const { cpf } = req.headers
    const customer = customers.find((customer) => customer.cpf === cpf)

    if (!customer) {
        return res.status(400).json({ error: "Customer does't exist" })
    }

    req.customer = customer

    return next()
}

function getBalance(statement) {
    const balance = statement.reduce((acc, operation) => {
        if (operation.type === 'credit') {
            return acc + operation.amount
        } else {
            return acc - operation.amount   
        }
    }, 0)

    return balance
}

// Cadastro via body params que bloqueia caso o CPF já exista. Respondendo status diferentes em cada caso.
app.post('/account', (req, res) => {
    const { cpf, name } = req.body
    const customerAlredyExists = customers.some(
        (customer) => customer.cpf === cpf
    )

    if (customerAlredyExists) {
        return response.status(400).json({ error: "Custumer alredy existis!"})
    }

    customers.push({
        cpf,
        name,
        id: uuidv4(),
        statement: [],
    })

    return res.status(201).json({ msg: name})
})

app.get('/account', cpfVerifyAccount, (req, res) => {
    const { custumer } = req

    return res.json({ msg: custumer })
})

app.get('/statement', cpfVerifyAccount, (req, res) => {
    const { customer } = req

    return res.json(customer)
})

app.post('/deposit', cpfVerifyAccount, (req, res) => {
    const { amount, description } = req.body
    const { customer } = req
    const statementOperation = {
        description,
        amount,
        createAt: new Date(),
        type: "credit",
    }

    customer.statement.push(statementOperation)
    return res.status(201).send()
})

app.post('/withdraw', cpfVerifyAccount, (req, res) => {
    const { amount } = req.body
    const { customer } = req
    const balance = getBalance(customer.statement)

    if (amount > balance) {
        return res.status(400).json({ error: "The funds are insufficient" })
    }

    const statementOperation = {
        amount,
        createAt: new Date(),
        type: "debit",
    }

    customer.statement.push(statementOperation)
    return res.status(201).json( {msg: "Saque concluído"})
})

app.get('/statement/date', cpfVerifyAccount, (req, res) => {
    const { customer } = req
    const { date } = req.query

    const dateFormat = new Date(date + " 00:00")

    const statement = customer.statement.filter(
        (statement) =>
            statement.createAt.toDateString() ===
            new Date(dateFormat).toDateString()
    )

    return res.json(statement)
})

app.put('/account', cpfVerifyAccount, (req, res) => {
    const { name } = req.body
    const { customer } = req

    customer.name = name

    return res.status(201).json({ msg: "ok" })
})

app.delete('/account', cpfVerifyAccount, (req, res) => {
    const { custumer } = req

    custumer.splice(custumer, 1)

    return response.status(200).json(customers)
})