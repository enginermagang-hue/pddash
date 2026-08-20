import app from '../backend/server.js'

export default async function handler(req, res) {
  await app(req, res)
}
