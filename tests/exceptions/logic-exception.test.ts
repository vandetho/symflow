import { LogicException } from '../../src';

describe('LogicException', () => {
    test('should throw a LogicException', () => {
        // Arrange
        const expectedMessage = 'Place "{place}" cannot be the initial place as it does not exist.';

        // Act
        const action = () => {
            throw new LogicException(expectedMessage);
        };

        // Assert
        expect(action).toThrow(LogicException);
        expect(action).toThrow(expectedMessage);
    });
});
