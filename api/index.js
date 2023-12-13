require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { DateTime } = require("luxon");
const {
  sprintDBMap,
  taskIDMap,
  estimatesIDMap,
} = require("../routes/routes.js");
const {
  getCurrentSprint,
  getCurrentSprintDB,
  getTasksComplete,
  getNotionEstimates,
  updateEstimates,
} = require("../controllers/notionController");

const app = express();

app.use(cors());

let sprintDB = [];
let currentSprint = null;
let sprintName = "";
let notionEstimates = [];

let TASK_DB_ID = taskIDMap.team_one;
let SPRINT_DB_ID = sprintDBMap.team_one;
let ESTIMATES_DB_ID = estimatesIDMap.team_one;

async function initializeApp(TASK_DB_ID, SPRINT_DB_ID) {
  try {
    sprintDB = await getCurrentSprintDB(TASK_DB_ID, SPRINT_DB_ID);
    currentSprint = await getCurrentSprint(SPRINT_DB_ID);
    notionEstimates = await getNotionEstimates(ESTIMATES_DB_ID);
    sprintName = currentSprint.properties["Sprint name"].title[0].plain_text;

    app.listen(process.env.PORT, () => {
      console.log(`Server is running on port ${process.env.PORT}`);
    });
  } catch (error) {
    console.error("Error initializing the app:", error);
  }
}

initializeApp(TASK_DB_ID, SPRINT_DB_ID);

setInterval(async () => {
  for (const key in sprintDBMap) {
    try {
      sprintDB = await getCurrentSprintDB(taskIDMap[key], sprintDBMap[key]);
      currentSprint = await getCurrentSprint(sprintDBMap[key]);
      notionEstimates = await getNotionEstimates(estimatesIDMap[key]);
      const sprintStartDate = currentSprint.properties["Dates"].date.start;
      sprintName = currentSprint.properties["Sprint name"].title[0].plain_text;

      const today = DateTime.now();
      const target = today.minus({ days: 1 });

      const exists = notionEstimates.some(
        (obj) => obj.date === target.toISODate()
      );

      if (!exists) {
        updateEstimates(
          sprintDB,
          sprintStartDate,
          notionEstimates,
          sprintName,
          estimatesIDMap[key]
        );
        console.log("Estimates Updated");
      }
    } catch (error) {
      console.error("Error Updating Estimates:", error);
    }
  }
}, 1000 * 60 * 10);

app.get("/getData", async (req, res) => {
  try {
    sprintDB = await getCurrentSprintDB(TASK_DB_ID, SPRINT_DB_ID);
    currentSprint = await getCurrentSprint(SPRINT_DB_ID);
    notionEstimates = await getNotionEstimates(ESTIMATES_DB_ID);
    sprintName = currentSprint.properties["Sprint name"].title[0].plain_text;

    const tasks_completed = await getTasksComplete(sprintDB);
    res.json({ sprintDB, currentSprint, tasks_completed, notionEstimates });
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
});

app.get("/getTeamOneData", async (req, res) => {
  try {
    sprintDB = await getCurrentSprintDB(
      taskIDMap.team_one,
      sprintDBMap.team_one
    );
    currentSprint = await getCurrentSprint(sprintDBMap.team_one);
    notionEstimates = await getNotionEstimates(estimatesIDMap.team_one);
    sprintName = currentSprint.properties["Sprint name"].title[0].plain_text;

    const tasks_completed = await getTasksComplete(sprintDB);
    res.json({ sprintDB, currentSprint, tasks_completed, notionEstimates });
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
});

app.get("/getTeamTwoData", async (req, res) => {
  try {
    sprintDB = await getCurrentSprintDB(
      taskIDMap.team_two,
      sprintDBMap.team_two
    );
    currentSprint = await getCurrentSprint(sprintDBMap.team_two);
    notionEstimates = await getNotionEstimates(estimatesIDMap.team_two);
    sprintName = currentSprint.properties["Sprint name"].title[0].plain_text;

    const tasks_completed = await getTasksComplete(sprintDB);
    res.json({ sprintDB, currentSprint, tasks_completed, notionEstimates });
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
});

app.post("/updateData", async (req, res) => {
  const value = req.body.value;

  TASK_DB_ID = taskIDMap[value];
  SPRINT_DB_ID = sprintDBMap[value];
  ESTIMATES_DB_ID = estimatesIDMap[value];

  try {
    sprintDB = await getCurrentSprintDB(TASK_DB_ID, SPRINT_DB_ID);
    currentSprint = await getCurrentSprint(SPRINT_DB_ID);
    notionEstimates = await getNotionEstimates(ESTIMATES_DB_ID);

    res.json({ message: "Data received on the server" });
  } catch (error) {
    console.error("Error receiving the data:", error);
  }
});

module.exports = app;
