(function (global) {
  const W = 1080;
  const H = 1350;
  const RED = "#da291c";
  const YELLOW = "#ffc72c";
  const INK = "#17130f";
  const CREAM = "#f6f1e7";
  const PAPER = "#fffdf8";
  const SOFT = "#5b5248";

  function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function fillRound(ctx, x, y, w, h, r, color) {
    roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function strokeRound(ctx, x, y, w, h, r, color, width) {
    roundRect(ctx, x, y, w, h, r);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function wrapText(ctx, text, maxWidth, maxLines) {
    const chars = String(text || "").split("");
    const lines = [];
    let line = "";
    for (const ch of chars) {
      const next = line + ch;
      if (ctx.measureText(next).width > maxWidth && line) {
        lines.push(line);
        line = ch;
        if (lines.length === maxLines) break;
      } else {
        line = next;
      }
    }
    if (line && lines.length < maxLines) lines.push(line);
    if (lines.length === maxLines && chars.join("").length > lines.join("").length) {
      let last = lines[maxLines - 1];
      while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 1) {
        last = last.slice(0, -1);
      }
      lines[maxLines - 1] = `${last}…`;
    }
    return lines;
  }

  function drawBurger(ctx, cx, cy, scale) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    ctx.fillStyle = YELLOW;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.ellipse(0, -58, 96, 62, 0, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#f4b400";
    for (const seed of [-46, -12, 24, 54]) {
      ctx.beginPath();
      ctx.ellipse(seed, -70, 7, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#7ac143";
    ctx.beginPath();
    ctx.ellipse(-6, -4, 104, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#8b3a1a";
    roundRect(ctx, -98, 10, 196, 34, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffd15c";
    roundRect(ctx, -92, 44, 184, 22, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#e8a33d";
    ctx.beginPath();
    ctx.moveTo(-96, 66);
    ctx.quadraticCurveTo(0, 110, 96, 66);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function draw(canvas, data) {
    const ctx = canvas.getContext("2d");
    canvas.width = W;
    canvas.height = H;

    ctx.fillStyle = CREAM;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(23,19,15,0.06)";
    for (let y = 24; y < H; y += 34) {
      for (let x = 24; x < W; x += 34) {
        ctx.beginPath();
        ctx.arc(x, y, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = RED;
    ctx.fillRect(0, 0, W, 172);
    fillRound(ctx, 58, 48, 88, 88, 20, YELLOW);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    roundRect(ctx, 58, 48, 88, 88, 20);
    ctx.stroke();
    ctx.fillStyle = RED;
    ctx.font = "900 56px 'Arial Black', 'Microsoft YaHei', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("M", 102, 112);
    ctx.textAlign = "left";
    ctx.fillStyle = "#fff";
    ctx.font = "900 46px 'Microsoft YaHei', 'PingFang SC', sans-serif";
    ctx.fillText("麦计 · 饭点管家", 172, 96);
    ctx.fillStyle = YELLOW;
    ctx.font = "700 20px 'Microsoft YaHei', 'PingFang SC', sans-serif";
    ctx.fillText("MCD MEAL PLANNER", 174, 132);

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "700 21px 'Microsoft YaHei', 'PingFang SC', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(data.date || "", W - 62, 96);
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = "500 18px 'Microsoft YaHei', 'PingFang SC', sans-serif";
    ctx.fillText(data.storeName || "", W - 62, 128);
    ctx.textAlign = "left";

    const left = 74;
    const width = W - left * 2;

    fillRound(ctx, left, 230, width, H - 320, 30, PAPER);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    roundRect(ctx, left, 230, width, H - 320, 30);
    ctx.stroke();

    const inner = left + 54;
    const innerWidth = width - 108;

    fillRound(ctx, inner, 286, 172, 44, 22, YELLOW);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    roundRect(ctx, inner, 286, 172, 44, 22);
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.font = "900 24px 'Microsoft YaHei', 'PingFang SC', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(data.slotLabel || "这一顿", inner + 86, 316);
    ctx.textAlign = "left";

    drawBurger(ctx, W - 250, 470, 0.82);

    ctx.fillStyle = SOFT;
    ctx.font = "700 22px 'Microsoft YaHei', 'PingFang SC', sans-serif";
    ctx.fillText("今日饭签", inner, 388);

    ctx.fillStyle = INK;
    ctx.font = "900 62px 'Microsoft YaHei', 'PingFang SC', sans-serif";
    const titleLines = wrapText(ctx, data.title || "这一顿", innerWidth - 240, 2);
    titleLines.forEach((line, index) => {
      ctx.fillText(line, inner, 470 + index * 74);
    });

    ctx.fillStyle = SOFT;
    ctx.font = "700 22px 'Microsoft YaHei', 'PingFang SC', sans-serif";
    ctx.fillText(`目标 ${data.targetKcal || "-"} kcal`, inner, 624);

    let y = 690;
    ctx.strokeStyle = "rgba(23,19,15,0.16)";
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.moveTo(inner, y);
    ctx.lineTo(inner + innerWidth, y);
    ctx.stroke();
    ctx.setLineDash([]);

    y += 54;
    ctx.font = "600 27px 'Microsoft YaHei', 'PingFang SC', sans-serif";
    for (const item of data.items || []) {
      ctx.fillStyle = INK;
      const nameLines = wrapText(ctx, item.name, innerWidth - 170, 1);
      ctx.fillText(nameLines[0] || "", inner, y);
      ctx.fillStyle = SOFT;
      ctx.font = "700 23px 'Microsoft YaHei', 'PingFang SC', sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`${Math.round(item.kcal)} kcal`, inner + innerWidth, y);
      ctx.textAlign = "left";
      ctx.font = "600 27px 'Microsoft YaHei', 'PingFang SC', sans-serif";
      y += 46;
    }

    y += 20;
    const boxW = (innerWidth - 22) / 2;
    fillRound(ctx, inner, y, boxW, 122, 20, "#fdf3d0");
    strokeRound(ctx, inner, y, boxW, 122, 20, INK, 3);
    fillRound(ctx, inner + boxW + 22, y, boxW, 122, 20, "#fde3df");
    strokeRound(ctx, inner + boxW + 22, y, boxW, 122, 20, INK, 3);

    ctx.fillStyle = SOFT;
    ctx.font = "700 20px 'Microsoft YaHei', 'PingFang SC', sans-serif";
    ctx.fillText("这顿热量", inner + 24, y + 38);
    ctx.fillText("参考价格", inner + boxW + 46, y + 38);
    ctx.fillStyle = INK;
    ctx.font = "900 46px 'Microsoft YaHei', 'PingFang SC', sans-serif";
    ctx.fillText(`${data.kcal || "-"}`, inner + 24, y + 94);
    ctx.fillStyle = RED;
    ctx.fillText(`¥${data.price || "-"}`, inner + boxW + 46, y + 94);

    y += 160;
    fillRound(ctx, inner, y, innerWidth, 108, 18, "#fff4c9");
    ctx.fillStyle = INK;
    ctx.font = "700 24px 'Microsoft YaHei', 'PingFang SC', sans-serif";
    const reasonLines = wrapText(ctx, data.reason || "", innerWidth - 44, 2);
    reasonLines.forEach((line, index) => {
      ctx.fillText(line, inner + 22, y + 44 + index * 34);
    });

    ctx.fillStyle = SOFT;
    ctx.font = "500 18px 'Microsoft YaHei', 'PingFang SC', sans-serif";
    ctx.fillText("数据来自麦当劳中国 MCP · 价格为到店自取参考 · 非麦当劳官方产品", left + 8, H - 56);
    ctx.textAlign = "right";
    ctx.fillStyle = RED;
    ctx.font = "800 18px 'Microsoft YaHei', 'PingFang SC', sans-serif";
    ctx.fillText(data.mode === "snapshot" ? "快照演示" : "实时配餐", left + width - 8, H - 56);
    ctx.textAlign = "left";
  }

  global.MealCard = { draw };
})(window);
