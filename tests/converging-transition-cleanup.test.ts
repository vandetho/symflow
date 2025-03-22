import { Symflow, WorkflowDefinition } from '../src';

interface Article {
    id: number;
    state: string[];
}

describe('🧪 Symflow - Converging Fork Cleanup (Real Transitions)', () => {
    const workflowDefinition: WorkflowDefinition<Article> = {
        name: 'article',
        stateField: 'state',
        initialState: ['draft'],
        auditTrail: false,
        places: {
            draft: {},
            'waiting for journalist': {},
            'wait for spellchecker': {},
            'approved by journalist': {},
            'approved by spellchecker': {},
            published: {},
        },
        transitions: {
            'request review': {
                from: 'draft',
                to: ['waiting for journalist', 'wait for spellchecker'],
            },
            'journalist approval': {
                from: 'waiting for journalist',
                to: 'approved by journalist',
            },
            'spellchecker approval': {
                from: 'wait for spellchecker',
                to: 'approved by spellchecker',
            },
            publish_from_journalist: {
                from: 'approved by journalist',
                to: 'published',
            },
            publish_from_spellchecker: {
                from: 'approved by spellchecker',
                to: 'published',
            },
        },
    };

    let article: Article;
    let workflow: Symflow<Article>;

    beforeEach(() => {
        article = { id: 1, state: ['draft'] };
        workflow = new Symflow(workflowDefinition);
    });

    it('✅ should transition from fork to published via spellchecker and clean journalist chain', async () => {
        await workflow.apply(article, 'request review'); // fork
        await workflow.apply(article, 'spellchecker approval'); // spellchecker path
        await workflow.apply(article, 'publish_from_spellchecker'); // converging

        expect(article.state).toEqual(['published']);
    });

    it('✅ should transition from fork to published via journalist and clean spellchecker chain', async () => {
        await workflow.apply(article, 'request review'); // fork
        await workflow.apply(article, 'journalist approval'); // journalist path
        await workflow.apply(article, 'publish_from_journalist'); // converging

        expect(article.state).toEqual(['published']);
    });
});
