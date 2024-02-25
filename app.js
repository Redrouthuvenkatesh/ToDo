const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const app = express()
app.use(express.json())
let db = null
const dbpath = path.join(__dirname, 'todoApplication.db')

async function initializeDbAndServer() {
  try {
    db = await open({filename: dbpath, driver: sqlite3.Database})

    await db.run(`CREATE TABLE IF NOT EXISTS todo (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            todo TEXT,
            priority TEXT,
            status TEXT
        )`)

    let insertValues = `
            INSERT INTO todo (todo, priority, status)
            VALUES (?, ?, ?),
                   (?, ?, ?),
                   (?, ?, ?)
        `
    await db.run(insertValues, [
      'Learn HTML',
      'HIGH',
      'TO DO',
      'Learn JS',
      'MEDIUM',
      'DONE',
      'Learn CSS',
      'LOW',
      'IN PROGRESS',
    ])

    app.listen(3000, () => {
      console.log('Server Running at 3000')
    })
  } catch (err) {
    console.log(`Db.Error: ${err.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()

// Route to fetch all todos
app.get('/todos/', async (req, res) => {
  const {status, priority, search_q} = req.query

  let query = 'SELECT * FROM todo'

  if (status !== undefined) {
    query += ` WHERE status='${status}'`
  } else if (priority !== undefined) {
    query += ` WHERE priority='${priority}'`
  } else if (search_q !== undefined) {
    query += ` WHERE todo LIKE '%${search_q}%'`
  }

  try {
    const todos = await db.all(query)
    res.json(todos)
  } catch (err) {
    console.error(`Error fetching todos: ${err.message}`)
    res.status(500).json({error: 'Internal Server Error'})
  }
})

// Route to fetch a specific todo by ID
app.get('/todos/:todoId/', async (req, res) => {
  const {todoId} = req.params
  const query = `SELECT * FROM todo WHERE id=${todoId}`

  try {
    const todo = await db.get(query)
    if (todo) {
      res.json(todo)
    } else {
      res.status(404).json({error: 'Todo not found'})
    }
  } catch (err) {
    console.error(`Error fetching todo: ${err.message}`)
    res.status(500).json({error: 'Internal Server Error'})
  }
})

// Route to add a new todo
app.post('/todos/', async (req, res) => {
  const {todo, priority, status} = req.body
  const query = `INSERT INTO todo (todo, priority, status) VALUES (?, ?, ?)`

  try {
    await db.run(query, [todo, priority, status])
    res.send('Todo Successfully Added')
  } catch (err) {
    console.error(`Error adding todo: ${err.message}`)
    res.status(500).json({error: 'Internal Server Error'})
  }
})

// Route to update a todo
app.put('/todos/:todoId/', async (req, res) => {
  const {todoId} = req.params
  const {status, priority, todo} = req.body

  try {
    let responseMessage = ''

    if (status !== undefined) {
      await db.run('UPDATE todo SET status = ? WHERE id = ?', [status, todoId])
      responseMessage = 'Status Updated'
    } else if (priority !== undefined) {
      await db.run('UPDATE todo SET priority = ? WHERE id = ?', [
        priority,
        todoId,
      ])
      responseMessage = 'Priority Updated'
    } else if (todo !== undefined) {
      await db.run('UPDATE todo SET todo = ? WHERE id = ?', [todo, todoId])
      responseMessage = 'Todo Updated'
    } else {
      return res.status(400).json({error: 'No valid field provided for update'})
    }

    res.send(responseMessage)
  } catch (err) {
    console.error(`Error updating todo: ${err.message}`)
    res.status(500).json({error: 'Internal Server Error'})
  }
})

// Route to delete a todo
app.delete('/todos/:todoId/', async (req, res) => {
  const {todoId} = req.params
  const query = `DELETE FROM todo WHERE id=?`

  try {
    const result = await db.run(query, [todoId])
    if (result.changes > 0) {
      res.send('Todo Deleted')
    } else {
      res.status(404).send('Todo not found')
    }
  } catch (err) {
    console.error(`Error deleting todo: ${err.message}`)
    res.status(500).json({error: 'Internal Server Error'})
  }
})

module.exports = app
