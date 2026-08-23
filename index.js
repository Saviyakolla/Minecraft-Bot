const mineflayer = require("mineflayer");

const {
  pathfinder,
  Movements,
  goals
} = require("mineflayer-pathfinder");

const collectBlock = require("mineflayer-collectblock").plugin;
const toolPlugin = require("mineflayer-tool").plugin;

// =====================================================
// CONFIG
// =====================================================

const CONFIG = {
  host: "hexoramc.ominisave.store",
  port: 25565,

 
  botCount: 20,

  
  namePrefix: "HexoraManager",

  
  minPlayTime: 30 * 60 * 1000,
  maxPlayTime: 2 * 60 * 60 * 1000,

 
  minReconnect: 5 * 60 * 1000,
  maxReconnect: 10 * 60 * 1000,

  
  actionMinDelay: 5 * 1000,
  actionMaxDelay: 25 * 1000,

 
  exploreRadius: 12
};

// =====================================================
// STATE
// =====================================================

let bot = null;
let currentName = null;

let sessionTimer = null;
let actionTimer = null;
let reconnectTimer = null;

let shuttingDown = false;
let lastNameNumber = 0;

let movements = null;

// =====================================================
// RANDOM
// =====================================================

function random(min, max) {
  return Math.floor(
    Math.random() * (max - min + 1)
  ) + min;
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function randomItem(array) {
  return array[
    random(0, array.length - 1)
  ];
}

function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(
    (seconds % 3600) / 60
  );

  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }

  return `${minutes}m ${secs}s`;
}

// =====================================================
// LOG
// =====================================================

function log(message) {
  console.log(
    `[${new Date().toLocaleTimeString()}] ${message}`
  );
}

// =====================================================
// RANDOM BOT NAME
// =====================================================

function getRandomName() {
  let number;

  do {
    number = random(1, CONFIG.botCount);
  } while (
    CONFIG.botCount > 1 &&
    number === lastNameNumber
  );

  lastNameNumber = number;

  return `${CONFIG.namePrefix}${number}`;
}

// =====================================================
// CLEAR TIMERS
// =====================================================

function clearTimers() {

  if (sessionTimer) {
    clearTimeout(sessionTimer);
    sessionTimer = null;
  }

  if (actionTimer) {
    clearTimeout(actionTimer);
    actionTimer = null;
  }
}

// =====================================================
// CREATE BOT
// =====================================================

function createBot() {

  if (shuttingDown) return;

  if (bot) {
    log("Bot already exists.");
    return;
  }

  currentName = getRandomName();

  log("==========================================");
  log("HEXORA SERVER MANAGEMENT");
  log("==========================================");
  log(`Connecting : ${currentName}`);
  log(`Server     : ${CONFIG.host}:${CONFIG.port}`);
  log("==========================================");

  bot = mineflayer.createBot({
    host: CONFIG.host,
    port: CONFIG.port,

    username: currentName,

    auth: "offline"
  });

  // ===================================================
  // LOAD PLUGINS
  // ===================================================

  bot.loadPlugin(pathfinder);
  bot.loadPlugin(collectBlock);
  bot.loadPlugin(toolPlugin);

  // ===================================================
  // ERROR
  // ===================================================

  bot.on("error", error => {

    log(
      `[ERROR] ${error.message}`
    );

  });

  // ===================================================
  // KICK
  // ===================================================

  bot.on("kicked", reason => {

    log(
      `[KICKED] ${JSON.stringify(reason)}`
    );

  });

  // ===================================================
  // SPAWN
  // ===================================================

  bot.once("spawn", async () => {

    log("==========================================");
    log("BOT ONLINE");
    log("==========================================");
    log(`Username : ${bot.username}`);
    log(`Version  : ${bot.version}`);
    log(`Server   : ${CONFIG.host}:${CONFIG.port}`);
    log("==========================================");

    // -----------------------------------------------
    // PATHFINDER
    // -----------------------------------------------

    movements = new Movements(
      bot
    );

    movements.canDig = true;
    movements.allow1by1towers = false;
    movements.allowParkour = true;
    movements.allowSprinting = true;

    bot.pathfinder.setMovements(
      movements
    );

    // -----------------------------------------------
    // RANDOM SESSION
    // -----------------------------------------------

    const playTime = random(
      CONFIG.minPlayTime,
      CONFIG.maxPlayTime
    );

    log(
      `Session length: ${formatTime(playTime)}`
    );

    sessionTimer = setTimeout(() => {

      if (!bot) return;

      log(
        "Scheduled play session finished."
      );

      disconnectBot(
        "Scheduled session finished"
      );

    }, playTime);

    // -----------------------------------------------
    // START BEHAVIOUR
    // -----------------------------------------------

    scheduleAction();
  });

  // ===================================================
  // END
  // ===================================================

  bot.on("end", () => {

    log(
      `${currentName || "Bot"} disconnected.`
    );

    clearTimers();

    bot = null;
    movements = null;

    if (shuttingDown) {
      return;
    }

    const delay = random(
      CONFIG.minReconnect,
      CONFIG.maxReconnect
    );

    log(
      `Next bot: reconnecting in ${formatTime(delay)}`
    );

    reconnectTimer = setTimeout(() => {

      reconnectTimer = null;

      if (!bot && !shuttingDown) {
        createBot();
      }

    }, delay);
  });
}

// =====================================================
// ACTION SCHEDULER
// =====================================================

function scheduleAction() {

  if (!bot || !bot.entity) {
    return;
  }

  const delay = random(
    CONFIG.actionMinDelay,
    CONFIG.actionMaxDelay
  );

  actionTimer = setTimeout(
    performRandomAction,
    delay
  );
}

// =====================================================
// RANDOM ACTION
// =====================================================

async function performRandomAction() {

  if (!bot || !bot.entity) {
    return;
  }

  const actions = [
    "wander",
    "look",
    "jump",
    "wander",
    "mine",
    "look",
    "idle",
    "craft",
    "build"
  ];

  const action = randomItem(actions);

  try {

    switch (action) {

      case "wander":
        await wander();
        break;

      case "look":
        await lookAround();
        break;

      case "jump":
        await jumpAround();
        break;

      case "mine":
        await mineNearby();
        break;

      case "craft":
        await craftSimpleItem();
        break;

      case "build":
        await buildSmallStructure();
        break;

      case "idle":
        await idle();
        break;
    }

  } catch (error) {

    log(
      `Action ${action} failed: ${error.message}`
    );

  }

  scheduleAction();
}

// =====================================================
// WANDER
// =====================================================

async function wander() {

  if (!bot || !bot.entity) return;

  const origin =
    bot.entity.position;

  const x =
    origin.x + random(
      -CONFIG.exploreRadius,
      CONFIG.exploreRadius
    );

  const z =
    origin.z + random(
      -CONFIG.exploreRadius,
      CONFIG.exploreRadius
    );

  const y =
    origin.y;

  log(
    `Exploring toward ${Math.round(x)}, ${Math.round(y)}, ${Math.round(z)}`
  );

  try {

    await bot.pathfinder.goto(
      new goals.GoalNear(
        x,
        y,
        z,
        2
      )
    );

  } catch (error) {

    log(
      `Pathfinding stopped: ${error.message}`
    );

  }
}

// =====================================================
// LOOK AROUND
// =====================================================

async function lookAround() {

  if (!bot || !bot.entity) return;

  const yaw =
    randomFloat(
      -Math.PI,
      Math.PI
    );

  const pitch =
    randomFloat(
      -0.45,
      0.45
    );

  await bot.look(
    yaw,
    pitch,
    false
  );

  log("Looking around.");
}

// =====================================================
// JUMP
// =====================================================

async function jumpAround() {

  if (!bot) return;

  const count =
    random(1, 3);

  log(
    `Jumping ${count} time(s).`
  );

  for (let i = 0; i < count; i++) {

    if (!bot) return;

    bot.setControlState(
      "jump",
      true
    );

    await sleep(
      random(300, 700)
    );

    bot.setControlState(
      "jump",
      false
    );

    await sleep(
      random(400, 1000)
    );
  }
}

// =====================================================
// IDLE
// =====================================================

async function idle() {

  if (!bot) return;

  const duration =
    random(3000, 15000);

  log(
    `Idle for ${formatTime(duration)}`
  );

  bot.clearControlStates();

  await sleep(duration);
}

// =====================================================
// MINE NEARBY
// =====================================================

async function mineNearby() {

  if (!bot || !bot.entity) {
    return;
  }

  const allowedBlocks = [
    "stone",
    "cobblestone",
    "dirt",
    "grass_block",
    "sand",
    "gravel",
    "oak_log",
    "birch_log",
    "spruce_log",
    "coal_ore",
    "iron_ore"
  ];

  const block =
    bot.findBlock({
      matching: block => {

        if (!block) return false;

        return allowedBlocks.includes(
          block.name
        );
      },

      maxDistance: 8
    });

  if (!block) {

    log(
      "No suitable nearby block found."
    );

    return;
  }

  log(
    `Mining ${block.name} at ` +
    `${block.position.x},` +
    `${block.position.y},` +
    `${block.position.z}`
  );

  try {

    await bot.collectBlock.collect(
      block
    );

    log(
      `Collected ${block.name}`
    );

  } catch (error) {

    log(
      `Mining failed: ${error.message}`
    );

  }
}

// =====================================================
// CRAFT SIMPLE ITEMS
// =====================================================

async function craftSimpleItem() {

  if (!bot) return;

  const targets = [
    "stick",
    "crafting_table",
    "wooden_pickaxe",
    "wooden_axe"
  ];

  const target =
    randomItem(targets);

  const item =
    bot.registry.itemsByName[
      target
    ];

  if (!item) {
    return;
  }

  const recipes =
    bot.recipesFor(
      item.id,
      null,
      1,
      null
    );

  if (!recipes.length) {

    log(
      `No recipe available for ${target}`
    );

    return;
  }

  const recipe =
    recipes[0];

  try {

    // Crafting table is required for
    // recipes that need one.
    const needsTable =
      recipe.requiresTable;

    let craftingTable = null;

    if (needsTable) {

      craftingTable =
        bot.findBlock({
          matching:
            bot.registry.blocksByName
              .crafting_table?.id,
          maxDistance: 6
        });

      if (!craftingTable) {

        log(
          `${target} requires a crafting table.`
        );

        return;
      }

      await bot.pathfinder.goto(
        new goals.GoalNear(
          craftingTable.position.x,
          craftingTable.position.y,
          craftingTable.position.z,
          2
        )
      );
    }

    await bot.craft(
      recipe,
      1,
      craftingTable || null
    );

    log(
      `Crafted ${target}`
    );

  } catch (error) {

    log(
      `Crafting ${target} failed: ${error.message}`
    );

  }
}

// =====================================================
// SMALL BUILD
// =====================================================

async function buildSmallStructure() {

  if (!bot || !bot.entity) {
    return;
  }

  // Only build if the bot has blocks.
  const buildable = [
    "cobblestone",
    "dirt",
    "oak_planks",
    "birch_planks",
    "spruce_planks"
  ];

  const inventoryItem =
    bot.inventory.items()
      .find(item =>
        buildable.includes(
          item.name
        )
      );

  if (!inventoryItem) {

    log(
      "No building blocks available."
    );

    return;
  }

  const base =
    bot.entity.position
      .floored()
      .offset(2, -1, 0);

  log(
    `Building small structure using ${inventoryItem.name}`
  );

  // Small 2 x 2 platform
  for (let x = 0; x < 2; x++) {

    for (let z = 0; z < 2; z++) {

      if (!bot) return;

      const target =
        bot.blockAt(
          base.offset(
            x,
            0,
            z
          )
        );

      if (!target) continue;

      if (!target.name.includes("air")) {
        continue;
      }

      try {

        await bot.pathfinder.goto(
          new goals.GoalNear(
            target.position.x,
            target.position.y,
            target.position.z,
            3
          )
        );

        await bot.equip(
          inventoryItem,
          "hand"
        );

        const reference =
          bot.blockAt(
            target.position.offset(
              0,
              -1,
              0
            )
          );

        if (!reference) continue;

        await bot.placeBlock(
          reference,
          {
            x: 0,
            y: 1,
            z: 0
          }
        );

      } catch (error) {

        log(
          `Building block failed: ${error.message}`
        );
      }
    }
  }

  log(
    "Small building task finished."
  );
}

// =====================================================
// SLEEP
// =====================================================

function sleep(ms) {

  return new Promise(
    resolve => setTimeout(
      resolve,
      ms
    )
  );
}

// =====================================================
// DISCONNECT
// =====================================================

function disconnectBot(reason) {

  if (!bot) return;

  clearTimers();

  try {
    bot.clearControlStates();
  } catch {}

  log(
    `Disconnecting ${bot.username}: ${reason}`
  );

  try {

    bot.quit(
      reason
    );

  } catch (error) {

    log(
      `Disconnect error: ${error.message}`
    );

  }
}

// =====================================================
// STATUS
// =====================================================

setInterval(() => {

  console.log("");
  console.log("==========================================");
  console.log("       HEXORA MC BOT STATUS");
  console.log("==========================================");
  console.log(
    `Server : ${CONFIG.host}:${CONFIG.port}`
  );
  console.log(
    `Bot    : ${bot ? bot.username : "OFFLINE"}`
  );
  console.log(
    `Status : ${bot ? "ONLINE" : "OFFLINE"}`
  );

  if (bot) {
    console.log(
      `Health : ${bot.health}`
    );

    console.log(
      `Food   : ${bot.food}`
    );

    console.log(
      `Position: ${
        Math.round(bot.entity.position.x)
      }, ${
        Math.round(bot.entity.position.y)
      }, ${
        Math.round(bot.entity.position.z)
      }`
    );
  }

  console.log(
    "Pool   : HexoraManager1-20"
  );

  console.log(
    "==========================================");
  console.log("");

}, 5 * 60 * 1000);

// =====================================================
// START
// =====================================================

console.log("");
console.log("==========================================");
console.log("       HEXORA MC BOT SYSTEM");
console.log("==========================================");
console.log(
  `Server      : ${CONFIG.host}:${CONFIG.port}`
);
console.log(
  "Bot Pool    : HexoraManager1-20"
);
console.log(
  "Online Bots : 1"
);
console.log(
  "Play Time   : 30m - 2h"
);
console.log(
  "Reconnect   : 5m - 10m"
);
console.log(
  "Features    : Explore / Mine / Craft / Build"
);
console.log("==========================================");
console.log("");

createBot();

// =====================================================
// SHUTDOWN
// =====================================================

process.on("SIGINT", () => {

  shuttingDown = true;

  log(
    "Shutting down Hexora Server Management..."
  );

  clearTimers();

  if (reconnectTimer) {
    clearTimeout(
      reconnectTimer
    );
  }

  if (bot) {

    try {
      bot.clearControlStates();
      bot.quit(
        "Server shutdown"
      );
    } catch {}
  }

  setTimeout(() => {
    process.exit(0);
  }, 2000);
});
