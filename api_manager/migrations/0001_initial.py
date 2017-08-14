# -*- coding: utf-8 -*-
# Generated by Django 1.9.7 on 2016-10-21 10:46
from __future__ import unicode_literals

from django.db import migrations, models
import django.utils.timezone
import jsonfield.fields
import model_utils.fields


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='ExternalModule',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', model_utils.fields.AutoCreatedField(default=django.utils.timezone.now, editable=False, verbose_name='created_at')),
                ('updated_at', model_utils.fields.AutoLastModifiedField(default=django.utils.timezone.now, editable=False, verbose_name='updated_at')),
                ('module_instance', models.CharField(max_length=20, unique=True)),
                ('module_name', models.CharField(max_length=30, unique=True)),
                ('description', models.CharField(max_length=200)),
                ('version', models.CharField(max_length=20)),
                ('authors', jsonfield.fields.JSONField(default=b'{}')),
                ('run_in_events', jsonfield.fields.JSONField(default=b'{}')),
                ('acronym', models.CharField(max_length=5, unique=True)),
                ('filename', models.CharField(max_length=20, null=True)),
            ],
            options={
                'db_table': 'manati_externals_modules',
            },
        ),
    ]
