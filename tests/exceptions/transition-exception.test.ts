import { TransitionException } from '../../src';

describe('TransitionException', () => {
    test('should throw a TransitionException', () => {
        // Arrange
        const expectedMessage = 'Transition "{transition}" is not allowed from state "{state}".';

        // Act
        const action = () => {
            throw new TransitionException(expectedMessage);
        };

        // Assert
        expect(action).toThrow(TransitionException);
        expect(action).toThrow(expectedMessage);
    });
});
