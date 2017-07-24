
import Transaction from "../src/main";

import * as mongoose from 'mongoose';

mongoose.Promise = global.Promise

describe('Transaction using DB ', () => {

    const options: any = {
        reconnectInterval: 10,
        reconnectTries: 10,
        useMongoClient: true,
    }

    mongoose.connection
        .once('open', () => { console.log('Mongo connected!'); })
        .on('error', (err) => console.warn('Warning', err))

    let transaction: any

    const personSchema = new mongoose.Schema({
        age: Number,
        name: String
    })

    const carSchema = new mongoose.Schema({
        age: Number,
        name: String
    })

    const Person = mongoose.model('Person', personSchema)

    const Car = mongoose.model('Car', carSchema)

    async function dropCollections() {
        await Person.remove({});
        await Car.remove({});
    }

    /**
     * connect to database
     */
    beforeAll(async () => {
        await mongoose.connect(`mongodb://localhost/mongoose-transactions`, options)
    });

    /**
     * drop database collections
     * create new Transaction using database storage
     */
    beforeEach(async () => {
        // await dropCollections()
        const useDB = true
        transaction = new Transaction(useDB)
    })

    /**
     * drop database collections
     * close database connection
     */
    afterAll(async () => {
        // await dropCollections()
        await mongoose.connection.close()
        console.log('connection closed');
    })

    /**
     * remove transactions collection from database
     */
    afterEach(async () => {
        // await transaction.removeDbTransaction()
    })

    test('should create new transaction and remove it', async () => {

        const person: string = 'Person'

        const transId = await transaction.createTransaction()

        const trans = await transaction.loadDbTransaction(transId)

        expect(trans.status).toBe('pending')

        await transaction.removeDbTransaction(transId)

        expect(await transaction.loadDbTransaction(transId)).toBeNull()

    })

    test('should create transaction, insert, update and run', async () => {

        const person: string = 'Person'

        const transId = await transaction.createTransaction()

        const tonyObject: any = {
            age: 28,
            name: 'Tony'
        }

        const nicolaObject: any = {
            age: 32,
            name: 'Nicola',
        }

        const id = transaction.insert(person, tonyObject)

        transaction.update(person, id, nicolaObject, { new: true })

        let final: any

        let trans: any

        try {

            final = await transaction.run()

            expect(final).toBeInstanceOf(Array)
            expect(final.length).toBe(2)
            expect(final[0].name).toBe(tonyObject.name)
            expect(final[0].age).toBe(tonyObject.age)
            expect(final[1].name).toBe(nicolaObject.name)
            expect(final[1].age).toBe(nicolaObject.age)

            trans = await transaction.loadDbTransaction(transId)

            expect(trans.status).toBe('Success')
            expect(trans.operations).toBeInstanceOf(Array)
            expect(trans.operations.length).toBe(2)
            expect(trans.operations[0].status).toBe('Success')
            expect(trans.operations[1].status).toBe('Success')

        } catch (error) {
            console.error('run err =>', error)
            expect(error).toBeNull()
        }

    })

    test('should create transaction, insert, update, remove(fail) and run', async () => {

        const person: string = 'Person'

        const transId = await transaction.createTransaction().catch(console.error)

        const tonyObject: any = {
            age: 28,
            name: 'Tony'
        }

        const nicolaObject: any = {
            age: 32,
            name: 'Nicola',
        }

        const id = transaction.insert(person, tonyObject)

        transaction.update(person, id, nicolaObject, { new: true })

        const fakeId = new mongoose.Types.ObjectId()

        transaction.remove(person, fakeId)

        try {
            const final = await transaction.run()
        } catch (err) {
            console.error('err => ', err);
        }

        try {
            const trans = await transaction.loadDbTransaction(transId)
            console.log('trans =>', trans);
            expect(trans.status).toBe('Error')
            expect(trans.operations).toBeInstanceOf(Array)
            expect(trans.operations.length).toBe(3)
            expect(trans.operations[0].status).toBe('Success')
            expect(trans.operations[1].status).toBe('Success')
            expect(trans.operations[2].status).toBe('Error')

        } catch (err) {
            console.error('err =>', err);
            expect(err).toBeNull()

        }

        try {
            const rolled = await transaction.rollback()
            console.log('rolled =>', rolled);
        } catch (err) {
            console.error('roll =>', err);
            // expect(err).toBeNull()
        }

    })

})
