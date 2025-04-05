export default class Tree {
    static NODE_WIDTH = 200;
    static NODE_HEIGHT = 160;

    transformNodes(tranformedRulesArray) {
        const nodes = [];
        tranformedRulesArray.forEach((rule, i) => {
            nodes.push({
                id: `${rule.id}`,
                position: { x: 0, y: 0 },
                type: 'custom-node',
                data: {
                    id: rule.id,
                    name: rule.name,
                    priority: rule.priority,
                    action: rule.action,
                    ruleLabels: rule.ruleLabels,
                    labelState: rule.labelState,
                    hw: this.calculateCard(rule),
                    warnings: rule.warnings,
                    insertHeaders: rule.insertHeaders,
                    level: rule.level
                },
            });
        });

        this.calculateNodePositionZ(nodes);
        return nodes;
    }


    calculateCard(rule) {
        const text = [rule.name, ...rule.ruleLabels, ...rule.labelState.map(([_, label]) => label)];
        const width = Math.max(
            Tree.NODE_WIDTH,
            ...text.map(text => text?.length * 7 + 105 || 0)
        );
        const height = Math.max(
            text.length * 28 + 100,
            Tree.NODE_HEIGHT
        );

        return { height, width };
    }

    calculateNodePositionZ(nodes) {
        let currentX = 100;
        let currentY = 100;
        let direction = 1;
        let previousLevel = -1;
        let previousNodeSide = currentX;
        let previousNodeBottom = currentY;

        nodes.forEach((node, index) => {
            const currentNodeHeight = node.data.hw.height;

            if (index > 0) {
                currentY = previousNodeBottom + currentNodeHeight / 2 + 10;
            }

            const levelIncreased = previousLevel !== -1 && node.data.level > previousLevel;
            if (levelIncreased) {
                direction = -direction;
                currentY += 30;
            }

            currentX += (previousNodeSide + node.data.hw.width / 2 + 20) * direction;

            node.position = {
                x: currentX,
                y: currentY
            };

            previousNodeBottom = currentY + currentNodeHeight / 2;
            previousNodeSide = node.data.hw.width / 2;
            previousLevel = node.data.level;
        });
    }
}