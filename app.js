const express = require("express");
const { pool } = require("./dbConfig");
const bcrypt = require("bcrypt");
const passport = require("passport");
const flash = require("express-flash");
const session = require("express-session");
const methodOverride = require('method-override');
const ejsMate = require("ejs-mate");
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require("dotenv").config();
const path = require('path');
const XLSX = require('xlsx');
const cron = require('node-cron');
const app = express();
const PORT = process.env.PORT || 3000;

const initializePassport = require("./passportConfig");
initializePassport(passport);

const fs = require('fs');
const logFile = path.join(__dirname, 'logfile.log'); 

const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)){
    fs.mkdirSync(logDir);
}

const logTask = (task) => {
  const logEntry = `${new Date().toISOString()} - ${task}\n`;
  fs.appendFile(logFile, logEntry, (err) => {
    if (err) {
      console.error('Error logging task:', err);
    }
  });
};

// Middleware function to log the task
const logMiddleware = (task) => {
  return (req, res, next) => {
    logTask(task);
    next();
  };
};


// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
app.set("view engine", "ejs");
app.set('views', __dirname + '/views');
app.engine('ejs', ejsMate);
app.use(express.static('public'));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/users/register", checkAuthenticated, (req, res) => {
  res.render("register.ejs");
});


app.post("/users/register", async (req, res) => {
  let { name, email, password, password2, role } = req.body;
  let errors = [];

  if (!name || !email || !password || !password2 || !role) {
    errors.push({ message: "Please enter all fields" });
  }

  if (password.length < 6) {
    errors.push({ message: "Password must be at least 6 characters long" });
  }

  if (password !== password2) {
    errors.push({ message: "Passwords do not match" });
  }

  if (errors.length > 0) {
    res.render("register", { errors, name, email, password, password2, role });
  } else {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.rows.length > 0) {
        return res.render("register", { message: "Email already registered" });
      } else {
        await pool.query(
          `INSERT INTO users (name, email, password, role)
           VALUES ($1, $2, $3, $4)`,
          [name, email, hashedPassword, role]
        );
        req.flash("success_msg", "You are now registered. Please log in");
        res.redirect("/users/login");
      }
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  }
});


app.get("/users/login", checkAuthenticated, (req, res) => {
  res.render("login.ejs");
});

app.get("/users/dashboard", checkNotAuthenticated, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM locations WHERE is_deleted = FALSE');
    const totalScreens = result.rows.length;
    res.render("dashboard", { 
      user: req.user.name,
      locations: result.rows,
      totalScreens: totalScreens 
    });
  } catch (err) {
    console.error("Error fetching locations:", err);
    res.status(500).send("Error fetching locations");
  }
});

app.get("/users/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    // req.flash('success', 'You have logged out successfully');
    res.redirect('/login');
  });
});


app.post("/users/login",logMiddleware('user login'),
  passport.authenticate("local", {
    successRedirect: "/users/dashboard",
    failureRedirect: "/users/login",
    failureFlash: true
  })
);

app.post("/users/add", logMiddleware('New screen added'), async (req, res) => {
  const { pairing_code, screenname, tag, location, city, state, country, area } = req.body;     
  try {
    await pool.query(
      `INSERT INTO locations (pairing_code, screenname, tag, location, city, state, country, area)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [pairing_code, screenname, tag, location, city, state, country, area]
    );
    console.log('Submitted data:', { pairing_code, screenname, tag, location, city, state, country, area });
    res.redirect("/users/dashboard");
  } catch (err) {
    console.error("Error adding location:", err);
    res.status(500).send("Error adding location");
  }
});

app.get("/users/add", (req, res) => {
  res.render("addLocation");
});

app.get('/users/edit/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const location = await getLocationById(id);
    if (!location) {
      return res.status(404).send('Location not found');
    }
    res.render('edit', { location });
  } catch (err) {
    console.error('Error getting location by id:', err);
    res.status(500).send('Error getting location');
  }
});


app.get("/users/deleted", checkNotAuthenticated, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM locations WHERE is_deleted = TRUE');
    res.render("deletedScreens", { 
      user: req.user.name,
      locations: result.rows,
    });
  } catch (err) {
    console.error("Error fetching deleted locations:", err);
    res.status(500).send("Error fetching deleted locations");
  }
});


app.put('/users/edit/:id', logMiddleware('Screen edit'),async (req, res) => {
  const id = req.params.id;
  const { pairing_code, screenname, tag, location, city, state, country, area } = req.body;
  try {
    await updateLocation(id, { pairing_code, screenname, tag, location, city, state, country, area });
    res.redirect('/users/dashboard');
  } catch (err) {
    console.error('Error updating location:', err);
    res.status(500).send('Error updating location');
  }
});

app.delete('/users/delete/:id', logMiddleware('Screen deleted'), async (req, res) => {
  const locationId = req.params.id;
  try {
    await pool.query('UPDATE locations SET is_deleted = TRUE WHERE id = $1', [locationId]);
    req.flash('success_msg', 'Location deleted successfully');
    res.redirect('/users/dashboard');
  } catch (err) {
    console.error("Error deleting location:", err);
    res.status(500).send("Error deleting location");
  }
});


app.get('/users/groups/new', checkNotAuthenticated, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM locations WHERE is_deleted = FALSE');
    res.render('createGroup', { locations: result.rows });
  } catch (err) {
    console.error('Error fetching locations:', err);
    res.status(500).send('Error fetching locations');
  }
});


app.post('/users/groups', checkNotAuthenticated, async (req, res) => {
  const { groupName, selectedData } = req.body;

  if (!groupName || selectedData.length === 0) {
    return res.status(400).json({ success: false, message: 'Group name and selected data are required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO groups (name) VALUES ($1) RETURNING id',
      [groupName]
    );

    const groupId = result.rows[0].id;

    for (const locationId of selectedData) {
      await pool.query(
        'INSERT INTO group_locations (group_id, location_id) VALUES ($1, $2)',
        [groupId, locationId]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error creating group:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


app.get("/li", (req, res)=>{
  res.send("hello")
})


function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect("/users/dashboard");
  }
  next();
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/users/login");
}

const getLocationById = async (id) => {
  try {
    const result = await pool.query('SELECT * FROM locations WHERE id = $1', [id]);
    return result.rows[0];
  } catch (err) {
    console.error('Error getting location by id:', err);
    return null;
  }
};

const updateLocation = async (id, newData) => {
  try {
    const query = 'UPDATE locations SET pairing_code = $1, screenname = $2, tag = $3, location = $4, city = $5, state = $6, country = $7, area = $8 WHERE id = $9';
    const values = [newData.pairing_code, newData.screenname, newData.tag, newData.location, newData.city, newData.state, newData.country, newData.area, id];
    await pool.query(query, values);
    return true;
  } catch (err) {
    console.error('Error updating location:', err);
    return false;
  }
};







//multer cloudanary

// Cloudinary configuration
cloudinary.config({
  cloud_name: 'drodxjqch',
  api_key: '691681788634725',
  api_secret: 'j4lj8-_2WtgZZ_h1vDZGhQ32VXk'
});

// Configure Cloudinary storage engine
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'uploads',
    format: async (req, file) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (ext === '.jpeg' || ext === '.jpg' || ext === '.png' || ext === '.mp4') {
        return ext.substring(1); // removes the dot from the extension
      } else {
        throw new Error('Invalid file type');
      }
    },
    public_id: (req, file) => file.fieldname + '-' + Date.now()
  },
});

// const upload = multer({ storage: storage });

// Get Cloudinary account usage
app.get('/dashboard', (req, res) => {
  cloudinary.api.usage((error, result) => {
    if (error) {
      console.error('Error getting account usage:', error);
      res.render('show', { msg: 'Error getting account usage', storageUsed: 0 });
    } else {
      console.log('API Response:', result); // Log the entire result object

      // Checking the structure of the response
      if (result && result.total && typeof result.total.bytes === 'number') {
        const storageUsed = result.total.bytes / (1024 * 1024); // Convert bytes to MB
        res.render('show', { msg: null, storageUsed: storageUsed.toFixed(2) });
      } else if (result && typeof result === 'object') {
        // Logging each key in the response for better debugging  
        Object.keys(result).forEach(key => {
          console.log(`${key}:, result[key]`);
        });
        res.render('show', { msg: 'Unexpected API response format', storageUsed: 0 });
      } else {
        console.error('Unexpected API response format:', result);
        res.render('show', { msg: 'Unexpected API response format', storageUsed: 0 });
      }
    }
  });
});




// Initialize multer with Cloudinary storage engine
const upload = multer({
  storage: storage,
  limits: { fileSize: 10000000 }, // 10 MB
  fileFilter: (req, file, cb) => {
    checkFileType(file, cb);
  }
}).array('myImages', 10); // Allow up to 10 files

// Check file type
function checkFileType(file, cb) {
  const filetypes = /jpeg|jpg|png|mp4/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: Images and videos only!');
  }
}

// Define a global variable to store uploaded files
let files = [];

// Get uploaded images and render the library view
app.get('/upload', (req, res) => {
  cloudinary.api.resources({ type: 'upload', prefix: 'uploads/' }, (error, result) => {
    if (error) {
      res.render('library', { msg: 'Error retrieving images', files: [] });
    } else {
      files = result.resources; // Update the global files array
      res.render('library', { msg: null, files: files });
    }
  });
});

app.post('/delete', logMiddleware('Image deleted'), (req, res) => {
  const { public_id } = req.body;
  cloudinary.uploader.destroy(public_id, (error, result) => {
    if (error) {
      res.render('library', { msg: 'Error deleting image', files: [] });
    } else {
      res.redirect('/upload'); // Redirect to the library view after deleting
    }
  });
});

                 
// Upload route
app.post('/upload', logMiddleware('Image uploaded'), (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      res.render('library', { msg: err, files: [] });
    } else {
      if (req.files.length === 0) {
        res.render('library', { msg: 'No files selected!', files: [] });
      } else {
        cloudinary.api.resources({ type: 'upload', prefix: 'uploads/' }, (error, result) => {
          if (error) {
            res.render('library', { msg: 'Error retrieving images', files: [] });
          } else {
            res.render('library', {
              msg: 'Files uploaded!',
              files: result.resources
            });
          }
        });
      }
    }
  });
});

// Index route
app.get('/play', (req, res) => {
  cloudinary.api.resources({ type: 'upload', prefix: 'uploads/' }, (error, result) => {
    if (error) {
      res.render('playlist', { msg: 'Error retrieving images', files: [] });
    } else {
      res.render('playlist', { msg: null, files: result.resources });
    }
  });
}); 

// Upload route
app.post('/play', (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      res.render('playlist', { msg: err, files: [] });
    } else {
      if (req.files.length === 0) {
        res.render('playlist', { msg: 'No files selected!', files: [] });
      } else {
        cloudinary.api.resources({ type: 'upload', prefix: 'uploads/' }, (error, result) => {
          if (error) {
            res.render('playlist', { msg: 'Error retrieving images', files: [] });
          } else {
            res.render('playlist', {
              msg: 'Files uploaded!',
              files: result.resources
            });
          }
        });
      }
    }
  });
});

//logs
app.get('/logs', (req, res) => {
  fs.readFile(logFile, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading log file:', err);
      res.status(500).send('Error reading log file');
    } else {
      const logs = data.split('\n').filter(log => log.length > 0).map(log => {
        const [date, category, action, message, ipAddress] = log.split(',');
        return { date, category, action, message, ipAddress };
      }).reverse(); // Reverse the array to show the newest logs first
      res.render('logs', { logs });
    }
  });
});



// Function to delete logs older than 5 days
const deleteOldLogs = async () => {
  try {
    const query = `DELETE FROM logs WHERE date < NOW() - INTERVAL '5 days'`;
    await pool.query(query);
    console.log('Old logs deleted successfully');
  } catch (error) {
    console.error('Error deleting old logs:', error);
  }
};

// Schedule the task to run daily at midnight
cron.schedule('0 0 * * *', () => {
  deleteOldLogs();
});

// Route to export logs
app.get('/export-logs', async (req, res) => {
  try {
    const query = 'SELECT * FROM logs';
    const result = await pool.query(query);
    const logs = result.rows;

    const worksheet = XLSX.utils.json_to_sheet(logs);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Logs');

    const filePath = path.join(__dirname, 'logs.xlsx');
    XLSX.writeFile(workbook, filePath);

    res.download(filePath, 'logs.xlsx', (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        res.status(500).send('Error downloading file');
      } else {
        fs.unlinkSync(filePath); // Delete the file after download
      }
    });
  } catch (error) {
    console.error('Error exporting logs:', error);
    res.status(500).send('Error exporting logs');
  }
});

// Route to delete a specific log
app.delete('/delete-log/:id', async (req, res) => {
  try {
    const logId = req.params.id;
    const query = 'DELETE FROM logs WHERE id = $1';
    await pool.query(query, [logId]);
    res.status(200).send('Log deleted successfully');
  } catch (error) {
    console.error('Error deleting log:', error);
    res.status(500).send('Error deleting log');
  }
});

// Route to render the proposals page
app.get('/proposals', async (req, res) => {
  try {
    // Retrieve all proposals from the database
    const query = 'SELECT * FROM proposals';
    const { rows } = await pool.query(query);

    // Render the proposals page and pass the data
    res.render('proposals', { proposals: rows });
  } catch (error) {
    console.error('Error retrieving proposals from database:', error);
    res.status(500).json({ error: 'An error occurred while retrieving proposals' });
  }
});


// Route to render the proposals page
app.get('/proposals', async (req, res) => {
  try {
    // Retrieve all proposals from the database
    const query = 'SELECT * FROM proposals';
    const { rows } = await pool.query(query);

    // Render the proposals page and pass the data
    res.render('proposals', { proposals: rows });
  } catch (error) {
    console.error('Error retrieving proposals from database:', error);
    res.status(500).json({ error: 'An error occurred while retrieving proposals' });
  }
});


app.post('/proposals', (req, res) => {
  const { name, summary, inventoryStatus, reach, clientName, startOn, runsFor, slotDuration, cities, propertyType, plan, advertisementTag, fileName, media, creativeInstructions } = req.body;

  pool.query('INSERT INTO proposals (name, summary, inventory_status, reach, client_name, start_on, runs_for, slot_duration, cities, property_type, plan, advertisement_tag, file_name, media, creative_instructions) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)',
      [name, summary, inventoryStatus, reach, clientName, startOn, runsFor, slotDuration, cities.join(','), propertyType, plan, advertisementTag, fileName, media, creativeInstructions],
      (err, result) => {
          if (err) {
              console.error('Error saving proposal to database:', err.stack);
              res.status(500).json({ error: 'An error occurred while saving the proposal' });
              return;
          }

          console.log('Proposal saved successfully');
          res.status(201).json({ message: 'Proposal saved successfully' });
      });
});

process.on('SIGINT', () => {
  pool.end(() => {
    console.log('Disconnected from PostgreSQL database');
    process.exit();
  });
});



process.on('SIGINT', () => {
  pool.end(() => {
    console.log('Disconnected from PostgreSQL database');
    process.exit();
  });
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});



