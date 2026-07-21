const transitionLayer = document.querySelector('.transition__morph__svg');
const transitionPath = transitionLayer?.querySelector('path');

export const TRANSITION_PATHS = {
    startBottom: 'M 0 100 V 100 Q 50 100 100 100 V 100 z',
    enterBottom: 'M 0 100 V 50 Q 50 0 100 50 V 100 z',
    fillBottom: 'M 0 100 V 0 Q 50 0 100 0 V 100 z',
    exitBottom: 'M 0 100 V 75 Q 50 40 100 75 V 100 z',
    startTop: 'M 0 0 V 0 Q 50 0 100 0 V 0 z',
    enterTop: 'M 0 0 V 50 Q 50 100 100 50 V 0 z',
    fillTop: 'M 0 0 V 100 Q 50 100 100 100 V 0 z',
    exitTop: 'M 0 0 V 25 Q 50 60 100 25 V 0 z',
};

const numberTokenRegex = /-?\d*\.?\d+(?:[eE][+-]?\d+)?/g;

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function easeOutSine(t) {
    return Math.sin((t * Math.PI) / 2);
}

function animatePath(pathElement, fromPath, toPath, duration, easing = (x) => x) {
    if (!pathElement) {
        return Promise.resolve();
    }

    const fromNumbers = Array.from(fromPath.match(numberTokenRegex) || [], Number);
    const toNumbers = Array.from(toPath.match(numberTokenRegex) || [], Number);
    const startTime = performance.now();

    return new Promise((resolve) => {
        function step(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easing(progress);
            let index = 0;

            const currentPath = fromPath.replace(numberTokenRegex, () => {
                const value = lerp(fromNumbers[index], toNumbers[index], eased);
                index += 1;
                return value.toFixed(3);
            });

            pathElement.setAttribute('d', currentPath);

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                resolve();
            }
        }

        if (duration <= 0) {
            pathElement.setAttribute('d', toPath);
            resolve();
        } else {
            requestAnimationFrame(step);
        }
    });
}

export async function runMorphTransition({ direction = 'bottom', onMid } = {}) {
    if (!transitionLayer || !transitionPath) {
        if (typeof onMid === 'function') {
            onMid();
        }
        return;
    }

    const isTop = direction === 'top';
    const start = isTop ? TRANSITION_PATHS.startTop : TRANSITION_PATHS.startBottom;
    const enter = isTop ? TRANSITION_PATHS.enterTop : TRANSITION_PATHS.enterBottom;
    const fill = isTop ? TRANSITION_PATHS.fillTop : TRANSITION_PATHS.fillBottom;
    const exit = isTop ? TRANSITION_PATHS.exitTop : TRANSITION_PATHS.exitBottom;
    const final = isTop ? TRANSITION_PATHS.startTop : TRANSITION_PATHS.startBottom;

    document.body.classList.add('is__transitioning');
    transitionLayer.classList.add('is-visible');
    transitionPath.setAttribute('d', start);

    await animatePath(transitionPath, start, enter, 600, easeOutSine);
    await animatePath(transitionPath, enter, fill, 500, easeOutSine);

    if (typeof onMid === 'function') {
        onMid();
    }

    await animatePath(transitionPath, fill, exit, 550, easeOutSine);
    await animatePath(transitionPath, exit, final, 500, easeOutSine);

    transitionLayer.classList.remove('is-visible');
    document.body.classList.remove('is__transitioning');
    transitionPath.setAttribute('d', TRANSITION_PATHS.startBottom);
}
