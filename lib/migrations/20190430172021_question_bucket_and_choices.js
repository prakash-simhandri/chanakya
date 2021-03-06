const _ = require('underscore');

exports.up = async (knex, Promise) => {
  // create the question buckets table
  await knex.schema
    .createTable('question_buckets', (table) => {
      table.increments();
      table.string('name', 100).notNullable();
      table.integer('numQuestions').notNullable();
      table.datetime('createdAt').notNullable();
    });

  // create the bucket choices mapping table
  await knex.schema
    .createTable('question_bucket_choices', (table) => {
      table.increments();
      table.integer('bucketId', 10).unsigned().references('id').inTable('question_buckets');
      table.text('questionIds').notNullable();
      table.datetime('createdAt').notNullable();
    });

  // rename the questionIds field in the version table to `data`
  // also change the type of the field to text
  await knex.schema.alterTable('test_versions', (table) => {
    table.text('questionIds').notNullable().alter();
    table.renameColumn('questionIds', 'data');
  });

  // get all the versions from the DB and see if anyone of them has an array in the data field
  // change that to the new structure. this is done because initially a version comprised of
  // just an array of question ids and that array was stored as it is. after this migration
  // will be a combination of question IDs and buckets(& their choices)
  const allVersions = await knex('test_versions').select('*');
  const promises = [];
  _.each(allVersions, (v) => {
    const dataJSON = JSON.parse(v.data);
    if (dataJSON.constructor === Array) {
      const newData = {
        questionIds: dataJSON,
      };
      promises.push(knex('test_versions').where({ id: v.id }).update({ data: JSON.stringify(newData) }));
    }
  });
  await Promise.all(promises);
};
