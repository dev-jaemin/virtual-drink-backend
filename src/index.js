import express from "express";
import dotenv from "dotenv";
import logger from "morgan";
import https from "https";
import http from "http";
import fs from "fs";

dotenv.config();

const options = {
    key: fs.readFileSync("./src/certificate/private.key"),
    cert: fs.readFileSync("./src/certificate/certificate.crt"),
};

const app = express();
const HTTP_PORT = process.env.HTTP_PORT || 80;
const HTTPS_PORT = process.env.HTTPS_PORT || 443;

// morgan : 로그를 좀 더 예쁘게 찍어주는 라이브러리
// combined모드가 좀 더 많은 로그 남김
if (process.env.NODE_ENV === "production") {
    app.use(logger("combined"));
} else {
    app.use(logger("dev"));
}

app.use(express.static("public"));
app.use(
    express.json({
        limit: "50mb",
    })
);
app.use(
    express.urlencoded({
        limit: "50mb",
        extended: true,
    })
);

app.get("/", (req, res) => {
    res.status(200).send({ message: "ok" });
});

// 위에서부터 순서대로 처리하므로 여기까지 왔다면 404 not found
app.get((req, res) => {
    res.status(404).send("not found");
});

http.createServer(app).listen(HTTP_PORT);
https.createServer(options, app).listen(HTTPS_PORT);
