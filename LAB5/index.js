const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname)); 

// open database
const DB_FILE = path.join(__dirname, 'product.db');
const db = new sqlite3.Database(DB_FILE, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('Failed to open database:', err.message);
    process.exit(1);
  }
});

// comment.json 
const COMMENT_FILE = path.join(__dirname, 'comment.json');

// API: return all movies
app.get('/api/movies', (req, res) => {
  db.all('SELECT * FROM movies', (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    const movies = rows.map(r => ({
      id: r.movie_id,
      image: r.movie_image,
      title: r.movie_title,
      description: r.movie_overview,
      release: r.movie_release_date,
      rating: r.movie_rate
    }));
    res.json(movies);
  });
});

// route: detail page
app.get('/movies/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM movies WHERE movie_id = ?', [id], (err, movie) => {
    if (err) return res.status(500).send('DB error');
    if (!movie) return res.status(404).send('Movie not found');

    // load comments
    const commentsData = JSON.parse(fs.readFileSync(COMMENT_FILE, 'utf-8'));
    const movieComments = commentsData[id] || [];

    // render HTML
    res.send(`
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <title>영화 상세정보</title>
        <link rel="stylesheet" href="/main.css">
      </head>
      <body>
        <div class="container">
          <header>
            <h1>영화 상세페이지</h1>
            <nav>
              <a href="/">메인페이지</a> | <a href="/login.html">로그인</a> | <a href="/signup.html">회원가입</a>
            </nav>
          </header>

          <section class="movie-detail">
            <h2>영화 id: ${movie.movie_id}</h2>
            <img src="${movie.movie_image}" alt="${movie.movie_title}" style="max-width:200px;">
            <h3>제목: ${movie.movie_title}</h3>
            <p><strong>줄거리:</strong> ${movie.movie_overview}</p>
            <p><strong>개봉일:</strong> ${movie.movie_release_date}</p>
            <p><strong>평점:</strong> ${movie.movie_rate}</p>
          </section>

          <section class="comments">
            <hr>
            <h3>영화 후기</h3>
            ${
              movieComments.map(c => `<p>• ${c}</p>`).join('')
            }
            <form method="POST" action="/movies/${id}/comments">
              <textarea name="comment" rows="3" style="width:100%;" placeholder="후기를 작성하세요" required></textarea>
              <button type="submit">댓글 남기기</button>
            </form>
          </section>
        </div>
      </body>
      </html>
    `);
  });
});

// new comment
app.post('/movies/:id/comments', (req, res) => {
  const id = req.params.id;
  const { comment } = req.body;
  const commentsData = JSON.parse(fs.readFileSync(COMMENT_FILE, 'utf-8'));
  if (!commentsData[id]) commentsData[id] = [];
  commentsData[id].push(comment);
  fs.writeFileSync(COMMENT_FILE, JSON.stringify(commentsData, null, 2));
  res.redirect(`/movies/${id}`);
});

// start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
