import { Router } from 'express'
import multer from 'multer'
import { getAll, create, update, remove } from '../controllers/watchlistController'
import { parseImportFile, confirmImport, parseImportFileAI } from '../controllers/watchlistImportController'
import { requireAuth } from '../middleware/auth'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

router.use(requireAuth)
router.get('/', getAll)
router.post('/', create)
router.patch('/:id', update)
router.put('/:id', update)
router.delete('/:id', remove)

router.post('/import/parse',    upload.single('file'), parseImportFile)
router.post('/import/confirm',  confirmImport)
router.post('/import/parse-ai', upload.single('file'), parseImportFileAI)

export default router
