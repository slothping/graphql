export function attachTooltipHandlers(element, tooltip, renderHtml) {
    const showTooltip = event => {
        tooltip.style.display = "block";
        tooltip.innerHTML = renderHtml();
        const touch = event.touches ? event.touches[0] : event;
        tooltip.style.left = (touch.clientX + 15) + "px";
        tooltip.style.top = (touch.clientY + 15) + "px";
    };

    const moveTooltip = event => {
        const touch = event.touches ? event.touches[0] : event;
        tooltip.style.left = (touch.clientX + 15) + "px";
        tooltip.style.top = (touch.clientY + 15) + "px";
    };

    const hideTooltip = () => {
        tooltip.style.display = "none";
    };

    element.addEventListener("mouseenter", showTooltip);
    element.addEventListener("mousemove", moveTooltip);
    element.addEventListener("mouseleave", hideTooltip);

    element.addEventListener("touchstart", e => {
        e.preventDefault();
        showTooltip(e);
    }, { passive: false });

    element.addEventListener("touchmove", e => {
        e.preventDefault();
        moveTooltip(e);
    }, { passive: false });

    element.addEventListener("touchend", hideTooltip);
    element.addEventListener("touchcancel", hideTooltip);
}

export function drawXPGraph(transactions) {
    const svg = document.getElementById("xp-graph");
    const tooltip = document.getElementById("tooltip");

    const width = 600;
    const height = 250;

    if (!transactions.length) {
        svg.innerHTML = "";
        return;
    }

    const totalXP = transactions.reduce((sum, t) => sum + t.amount, 0);
    const firstDate = new Date(transactions[0].createdAt).getTime();
    const now = Date.now();

    let cumulative = 0;
    const points = [];

    transactions.forEach(t => {
        cumulative += t.amount;
        const date = new Date(t.createdAt).getTime();
        const x = ((date - firstDate) / (now - firstDate)) * (width - 20) + 10;
        const y = height - ((cumulative / totalXP) * (height - 20));
        points.push(`${x},${y}`);
    });

    const lastY = height - ((totalXP / totalXP) * (height - 20));
    points.push(`${width - 10},${lastY}`);

    svg.innerHTML = `
        <polyline
            points="${points.join(" ")}" 
            fill="none"
            stroke="black"
            stroke-width="2"
        />
    `;

    cumulative = 0;

    transactions.forEach(t => {
        cumulative += t.amount;

        const date = new Date(t.createdAt).getTime();
        const x = ((date - firstDate) / (now - firstDate)) * (width - 20) + 10;
        const y = height - ((cumulative / totalXP) * (height - 20));

        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", x);
        circle.setAttribute("cy", y);
        circle.setAttribute("r", 5);
        circle.setAttribute("fill", "#2196f3");

        const projectName = t.path.split("/").pop();

        attachTooltipHandlers(circle, tooltip, () => `
            <strong>${projectName}</strong><br>
            XP: ${(t.amount / 1000).toFixed(2)} kB<br>
            Total XP: ${(cumulative / 1000).toFixed(2)} kB<br>
            Date: ${new Date(t.createdAt).toLocaleDateString()}
        `);

        svg.appendChild(circle);
    });
}

export function drawAuditGraph(up, down) {
    const svg = document.getElementById("audit-graph");
    const tooltip = document.getElementById("tooltip");

    const total = up + down;
    const upAngle = (up / total) * 360;
    const largeArc = upAngle > 180 ? 1 : 0;
    const x = 150 + 100 * Math.cos((upAngle - 90) * Math.PI / 180);
    const y = 150 + 100 * Math.sin((upAngle - 90) * Math.PI / 180);

    svg.innerHTML = "";

    const donePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    donePath.setAttribute("d", `M150 150 L150 50 A100 100 0 ${largeArc} 1 ${x} ${y} Z`);
    donePath.setAttribute("fill", "#4caf50");
    attachTooltipHandlers(donePath, tooltip, () => `
        <strong>Done</strong><br>
        XP: ${(up / 1000).toFixed(2)} kB<br>
        Percentage: ${((up / total) * 100).toFixed(1)}%
    `);
    svg.appendChild(donePath);

    const receivedPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    receivedPath.setAttribute("d", `M150 150 L${x} ${y} A100 100 0 ${largeArc ? 0 : 1} 1 150 50 Z`);
    receivedPath.setAttribute("fill", "#f44336");
    attachTooltipHandlers(receivedPath, tooltip, () => `
        <strong>Received</strong><br>
        XP: ${(down / 1000).toFixed(2)} kB<br>
        Percentage: ${((down / total) * 100).toFixed(1)}%
    `);
    svg.appendChild(receivedPath);

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "150");
    circle.setAttribute("cy", "150");
    circle.setAttribute("r", "55");
    circle.setAttribute("fill", "white");
    svg.appendChild(circle);

    const ratioText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    ratioText.setAttribute("x", "150");
    ratioText.setAttribute("y", "145");
    ratioText.setAttribute("text-anchor", "middle");
    ratioText.setAttribute("font-size", "16");
    ratioText.setAttribute("font-weight", "bold");
    ratioText.textContent = (up / down).toFixed(2);
    svg.appendChild(ratioText);

    const labelText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    labelText.setAttribute("x", "150");
    labelText.setAttribute("y", "165");
    labelText.setAttribute("text-anchor", "middle");
    labelText.setAttribute("font-size", "12");
    labelText.textContent = "Audit Ratio";
    svg.appendChild(labelText);
}
