import { EventEmitter } from 'events';
import { Symflow, WorkflowDefinition } from '../src';

interface Article {
    id: number;
    state: string[];
}

describe('🧪 Symflow EventEmitter Integration', () => {
    let emitter: EventEmitter;
    let workflow: Symflow<Article>;
    let article: Article;

    const workflowDefinition: WorkflowDefinition<Article> = {
        name: 'article',
        type: 'workflow',
        auditTrail: false,
        stateField: 'state',
        initialState: ['draft'],
        places: {
            draft: {},
            review: {},
            published: {},
        },
        transitions: {
            submit: { from: ['draft'], to: ['review'] },
            publish: { from: ['review'], to: ['published'] },
        },
    };

    beforeEach(() => {
        emitter = new EventEmitter();
        workflow = new Symflow(workflowDefinition, emitter);
        article = { id: 123, state: ['draft'] };
    });

    it('✅ should emit global event on transition', async () => {
        const spy = jest.fn();
        emitter.on('symflow.transition', spy);

        await workflow.apply(article, 'submit');

        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy.mock.calls[0][0].transition).toBe('submit');
    });

    it('✅ should emit workflow-level event', async () => {
        const spy = jest.fn();
        emitter.on('symflow.article.transition', spy);

        await workflow.apply(article, 'submit');

        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy.mock.calls[0][0].transition).toBe('submit');
    });

    it('✅ should emit specific transition event', async () => {
        const spy = jest.fn();
        emitter.on('symflow.article.transition.submit', spy);

        await workflow.apply(article, 'submit');

        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy.mock.calls[0][0].transition).toBe('submit');
    });
});
