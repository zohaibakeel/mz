// app.js

const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const app = express();
const dotenv = require("dotenv");

dotenv.config();


const port = process.env.port || 3000;




// Connect to MongoDB
mongoose.connect(process.env.BOOK_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});



// Define MongoDB schema and model
const Schema = mongoose.Schema;
const bookSchema = new Schema({
  bookTitle: String,
  bookDescription: String,
  category: String, // Add a category field to store the PDF category
  pdf:{
    data: Buffer, // Store the file data as a Buffer
    contentType: String, // Store the content type (e.g., application/pdf)
    filename: String, // Store the original filename
    downloads: { type: Number, default: 0 },
  },
});

const Book = mongoose.model('Book', bookSchema);
// Set up multer for handling form-data
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
app.use(express.json());
app.use(express.urlencoded({ extended: true }));





// Route to handle form-data POST request
app.post('/books', upload.single('pdf'), async (req, res) => {
  try {
    const { bookTitle, bookDescription, category } = req.body;
    const pdfFile = req.file; // Uploaded PDF file
    if (!pdfFile) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
      }
    // Create a new Book document
    const newBook = new Book({
      bookTitle,
      bookDescription,
      category, // Include the category field
      pdf: {
        data: pdfFile.buffer, // Store the file data as a Buffer
        contentType: pdfFile.mimetype, // Store the content type
        filename: pdfFile.originalname, // Store the original filename
      },
    });

    // Save the document to MongoDB
    await newBook.save();
    res.status(201).json({ message: 'Book saved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});





app.get('/books', async (req, res) => {
  try {
    // Retrieve all books from the database
    const books = await Book.find();
    // Create an array to store the book data with URLs
    const booksWithUrls = books.map((book) => {
      const bookId = book._id; // Use the unique identifier
      const pdfUrl = `/download/${bookId}`; // Construct the URL
      return {
        bookTitle: book.bookTitle,
        bookDescription: book.bookDescription,
        category: book.category,
        pdfUrl: pdfUrl,
      };
    });
    res.status(200).json(booksWithUrls);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});



app.get('/download/:bookId', async (req, res) => {
  try {
    const bookId = req.params.bookId;
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    const pdfData = book.pdf.data;
    const contentType = book.pdf.contentType;
    const filename = book.pdf.filename;
      // Increment the download count when the PDF is downloaded
    book.downloads += 1;
    await book.save();
    res.set('Content-Type', contentType);
    res.set('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});



