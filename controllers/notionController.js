const { DateTime } = require("luxon");
const { Client } = require("@notionhq/client");
require("dotenv").config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function getUserName(id) {
  if (id === null) {
    return "No user assigned";
  }

  try {
    const userId = id;
    const response = await notion.users.retrieve({ user_id: userId });

    // Check if the response contains the 'name' property
    if (response && response.name) {
      return response.name;
    } else {
      return "User name not found";
    }
  } catch (error) {
    console.error("Error retrieving user:", error);
    return "Error retrieving user";
  }
}

async function getNotionEstimates(DB_ID) {
  const response = await notion.databases.query({
    database_id: DB_ID,
  });

  const result = response.results.map((item) => {
    return {
      sprint: item.properties["Sprint"]["title"][0]["text"]["content"],
      date: item.properties["Date"]["date"]["start"],
      estimates: item.properties["Estimates"]["number"],
    };
  });

  return result;
}

async function addEstimateToNotion(DB_ID, estimate, sprint, date) {
  const response = await notion.pages.create({
    parent: {
      database_id: DB_ID,
    },
    properties: {
      Sprint: {
        type: "title",
        title: [
          {
            type: "text",
            text: {
              content: sprint,
            },
          },
        ],
      },
      Estimates: {
        type: "number",
        number: estimate,
      },
      Date: {
        type: "date",
        date: {
          start: date,
        },
      },
    },
  });
  console.log(response);
}

async function updateEstimates(
  sprintDB,
  sprintStartDate,
  notionEstimates,
  sprintName,
  ESTIMATES_DB_ID
) {
  try {
    let today = DateTime.now();

    if (today.weekday > 5) {
      return;
    }

    let totalEstimatesCaptured = 0;
    notionEstimates.forEach((item) => {
      if (item.date >= sprintStartDate) {
        totalEstimatesCaptured += item.estimates;
      }
    });

    const totalEstimatesEarned = await getEstimationComplete(sprintDB);

    previousDayTotal = totalEstimatesEarned - totalEstimatesCaptured;
    previousDay = null;

    if (today.weekday == 1) {
      previousDay = today.minus({ days: 3 });
    } else {
      previousDay = today.minus({ days: 1 });
    }

    return addEstimateToNotion(
      (DB_ID = ESTIMATES_DB_ID),
      (estimate = previousDayTotal),
      (sprint = sprintName),
      (date = previousDay.toISODate())
    );
  } catch (error) {
    console.error("An error occurred:", error.message);
  }
}

async function getCurrentSprintDB(TASK_DB_ID, SPRINT_DB_ID) {
  const response = await notion.databases.query({
    database_id: TASK_DB_ID,
  });

  const currentSprint = await getCurrentSprint(SPRINT_DB_ID);

  const filteredItems = response.results.filter((item) => {
    if (item.properties["Sprint"].relation.length != 0) {
      return item.properties["Sprint"].relation[0].id === currentSprint.id;
    }
  });

  let result = filteredItems.map(fromNotionObject);

  const promises = result.map(async function (e) {
    let id = e.assignee;
    e.assignee = await getUserName(id);
    return e;
  });

  const updatedResult = await Promise.all(promises);

  return updatedResult;
}

function fromNotionObject(notionPage) {
  return {
    id: notionPage.id,
    task_name:
      notionPage.properties["Task name"]["title"][0] === undefined
        ? ""
        : notionPage.properties["Task name"]["title"][0].plain_text,
    assignee:
      notionPage.properties["Assignee"]["people"].length != 0
        ? notionPage.properties["Assignee"]["people"][0].id
        : null,
    priority:
      notionPage.properties["Priority"]["select"] === null
        ? ""
        : notionPage.properties["Priority"]["select"]["name"],
    estimates:
      notionPage.properties["Estimates"]["select"] === null
        ? ""
        : notionPage.properties["Estimates"]["select"]["name"],
    status: notionPage.properties["Status"]["status"]["name"],
    trackStatus:
      notionPage.properties["Track Status"]["select"] === null
        ? ""
        : notionPage.properties["Track Status"]["select"]["name"],
  };
}

async function getCurrentSprint(SPRINT_DB_ID) {
  const response = await notion.databases.query({
    database_id: SPRINT_DB_ID,
  });
  const currentSprint = response.results.find((sprint) => {
    return sprint.properties["Sprint status"].status.id === "current";
  });
  return currentSprint;
}

async function getEstimationComplete(sprintDB) {
  let EV = 0.0;
  let totalEV = 0.0;

  Object.values(sprintDB).forEach(function (item) {
    const posEV = +item.estimates;
    totalEV += posEV;

    progressStatus = item.status;
    trackStatus = item.trackStatus;

    if (
      progressStatus.includes("Done") ||
      progressStatus.includes("Q/A") ||
      progressStatus.includes("In Review")
    ) {
      EV += posEV;
      // console.log(posEV);
    }
  });
  return Math.round((EV / totalEV) * 100);
}

module.exports = {
  getCurrentSprint,
  getCurrentSprintDB,
  fromNotionObject,
  getEstimationComplete,
  getNotionEstimates,
  addEstimateToNotion,
  updateEstimates,
};
