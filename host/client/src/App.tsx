import './App.css'
import { useState } from 'react'

function App() {
  const [input, setInput] = useState('')
  const [response, setResponse] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement Inngest agent network call here
    setResponse('Response will appear here...')
    setInput('')
  }

  return (
    <div className="App">
      <div className="response-area">
        {response || 'Welcome to the Inngest Agent Network. Type a message below to get started.'}
      </div>
      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="input-field"
        />
        <button type="submit" className="submit-button">
          Send
        </button>
      </form>
    </div>
  )
}

export default App
