// db.js — PostgreSQL replacement for JSON database
// Compatible avec l'ancien db.js :
// getUsers, findUserByEmail, findUserById, saveUser,
// getProjects, findProjectById, saveProject

import "dotenv/config";
import pg from "pg";

const { Pool } = pg;


// Connexion PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});


// Test connexion + création tables
async function ensureSchema() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        data JSONB NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_users_email
      ON users(email);


      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL
      );
    `);

    console.log("✅ PostgreSQL connecté et schéma vérifié");

  } catch (error) {
    console.error("❌ Erreur PostgreSQL :", error.message);
    process.exit(1);
  }
}


// Initialisation unique
const ready = ensureSchema();


// ================= USERS =================


export async function getUsers() {

  await ready;

  const result = await pool.query(
    "SELECT data FROM users"
  );

  return result.rows.map(row => row.data);
}



export async function findUserByEmail(email) {

  await ready;

  const result = await pool.query(
    "SELECT data FROM users WHERE email=$1",
    [email]
  );

  return result.rows[0]?.data;
}



export async function findUserById(id) {

  await ready;

  const result = await pool.query(
    "SELECT data FROM users WHERE id=$1",
    [id]
  );

  return result.rows[0]?.data;
}



export async function saveUser(user) {

  await ready;


  await pool.query(
    `
    INSERT INTO users(id,email,data)

    VALUES($1,$2,$3)

    ON CONFLICT(id)

    DO UPDATE SET
      email = EXCLUDED.email,
      data = EXCLUDED.data
    `,
    [
      user.id,
      user.email,
      user
    ]
  );


  return user;
}




// ================= PROJECTS =================



export async function getProjects(){

  await ready;


  const result = await pool.query(
    "SELECT data FROM projects"
  );


  return result.rows.map(row=>row.data);

}



export async function findProjectById(id){

  await ready;


  const result = await pool.query(
    "SELECT data FROM projects WHERE id=$1",
    [id]
  );


  return result.rows[0]?.data;

}



export async function saveProject(project){

  await ready;


  await pool.query(
    `
    INSERT INTO projects(id,data)

    VALUES($1,$2)

    ON CONFLICT(id)

    DO UPDATE SET
      data = EXCLUDED.data
    `,
    [
      project.id,
      project
    ]
  );


  return project;

}